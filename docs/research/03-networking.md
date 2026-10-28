# 3. Multijugador: reutilizar antes de inventar

Fecha: 2026-10-28. Base Boxedwine: `8790ff20428c22daa64368af9553417e4f499c94`.

## Hallazgo principal

Ya existe una cadena de red específica para navegador:

```text
AoE II / DirectPlay [pendiente de validar]
             ↕
Wine / Winsock
             ↕
Sockets invitados de Boxedwine
             ↕
source/kernel/kbrowsersocket.cpp
             ↕
project/emscripten/boxedwine-net.js
             ↕ WebSocket
project/emscripten/network-gateway.mjs
             ↕
Otros peers virtuales, o destinos permitidos del host
```

La presencia de esta cadena **no demuestra que DirectPlay funcione**. Permite empezar con pruebas de sockets y después con la red real del juego sin diseñar desde cero un protocolo de transporte.

## Qué hace el gateway inspeccionado

- Servidor Node, por defecto `127.0.0.1:8001`.
- Endpoint WebSocket `/boxedwine-network`.
- IP virtuales de una subred configurable, por defecto `10.0.3.`.
- Asignación de peers, listeners y conexiones TCP virtuales.
- Datagramas UDP con puertos, unicast y manejo de broadcast.
- Manejo específico de mDNS y mensajes de señalización.
- Contadores y dashboard; opcionalmente autenticación del dashboard.
- Conexión a destinos TCP/UDP del host mediante allowlist.
- Allowlist de orígenes para conexiones WebSocket.

La implementación inspeccionada de cliente no contiene un transporte RTCDataChannel/WebRTC. **Que el gateway retransmita señalización o tenga métricas de tráfico “direct” no demuestra que exista P2P funcional.** El transporte revisado es WebSocket.

### Comandos candidatos para laboratorio

Desde `project/emscripten`, después de disponer del build y filesystem:

```sh
node network-gateway.mjs --host 127.0.0.1 --port 8001
```

Activación del cliente observada en `boxedwine-shell.js`:

```text
?network=true&networkGateway=ws%3A%2F%2F127.0.0.1%3A8001%2Fboxedwine-network
```

Añadir esos parámetros al URL real del launcher, conservando los de app/root. `networkDebug=true` permite diagnóstico. La habilitación depende de que el shell permita parámetros URL. Sin modo `network` reconocido, la red queda desactivada. No se ha probado esta activación con un build WASM del juego.

En un sitio HTTPS se necesita WSS, normalmente mediante reverse proxy. No abrir puertos del router para cada jugador como primer diseño.

## Qué cubrieron las pruebas ejecutadas

`boxedwine-net.test.mjs` valida, entre otros:

- Backpressure TCP/UDP, errores y reconexión.
- Datagramas UDP vacíos y puertos efímeros.
- Colisiones de puertos.
- Cancelación de conexiones y readiness de listeners.
- Half-close TCP y propagación de errores.

`network-gateway.test.mjs` ejecuta un gateway local real con peers de prueba:

- Respuestas UDP al socket correcto.
- Half-close TCP conservando la dirección de respuesta.
- Colisiones de puerto y unicast al propietario.
- Cancelación y carreras de aceptación.
- JSON inválido aislado al peer infractor.
- Reutilización de IP después de muchas conexiones sucesivas.
- Límite de peers sin terminar el proceso del gateway.

Las 87 pruebas combinadas de esta sesión pasaron. No se ha probado toda la suite upstream y estas pruebas no incluyen DirectPlay, AoE II, WebRTC, Internet real ni carga adversarial de producción.

## DirectPlay: incertidumbres que requieren pruebas

La especificación Microsoft MC-DPL4CS documenta transporte DirectPlay 4 sobre TCP/UDP. Referencias comunitarias de AoE clásico mencionan TCP 47624 y rango TCP/UDP 2300–2400. **Son pistas de diagnóstico, no reglas para abrir puertos indiscriminadamente ni una captura del juego que usaremos.** UserPatch y otros proveedores pueden cambiar el comportamiento.

Validar:

1. Qué versión del juego, provider y DLL carga Wine.
2. Si permite crear y enumerar sesión TCP/IP.
3. Qué IP anuncia el entorno invitado y cuál se incluye dentro del payload DirectPlay.
4. Si los listeners y retornos UDP usan la IP virtual asignada.
5. Si la entrada por IP directa evita depender de descubrimiento broadcast.
6. Si el tráfico de la simulación necesita conexiones entre todos los jugadores, no solo con el host.
7. Si la temporización de sockets/Wine y la pausa de pestañas generan desconexiones.

Un relay de sockets puede transportar bytes correctamente y aun así fallar si el protocolo anuncia direcciones equivocadas dentro del payload. No añadir reescritura del protocolo sin evidencia de un fallo concreto.

## Salas y seguridad: no desplegar upstream sin cambios

**Observado:** `roomPeers`, `roomPeersByIp` y `roomTcpListeners` son globales al proceso. No se identificó una selección de `roomId` por cliente que cree varias salas aisladas. La “room” upstream es una LAN virtual compartida por instancia, no nuestro producto de salas con invitaciones.

**Observado:** la autenticación opcional se aplica a dashboard y API administrativa. El handler de upgrade valida ruta y origen, pero no pasa por `requireDashboardAuth`. **No asumir que `--auth` autentica a los jugadores.** Origin no reemplaza autenticación; un cliente no navegador puede falsificarlo.

**Observado:** las reglas de salida por defecto permiten `127.0.0.1:*` y `localhost:*`. Es práctico para laboratorio, pero puede exponer servicios locales del servidor a huéspedes conectados. `--allow-all` ampliaría mucho el riesgo; no usarlo en público.

Antes de desplegar necesitamos:

- Tickets de unión firmados, de corta duración, ligados a sala/peer.
- Aislamiento de IP, broadcast, señalización y listeners por sala.
- Autorizar cada destino según pertenencia; no confiar en `roomId` enviado sin verificar.
- Bloquear salida a servicios del host, LAN privada y metadatos cloud salvo una necesidad explícita.
- Límites de peers, sockets, bytes, tamaños, frecuencia de control y tiempos de inactividad por usuario/sala.
- Backpressure y límites de memoria; limpieza al desconectar.
- TLS, dashboard separado y protegido, registros sin contenido sensible.
- Pruebas negativas: una sala no puede leer/injectar tráfico de otra, enumerar peers ni alcanzar loopback.

Para una prueba local con dos navegadores en la misma máquina basta una instancia loopback aislada. Un proceso por sala podría simplificar un laboratorio posterior, pero no es todavía una decisión de despliegue ni sustituye auditoría.

## WebSocket primero; WebRTC solo si está justificado

WebSocket facilita el prototipo y evita NAT entrante. Si encapsula UDP, lo convierte en transporte fiable y ordenado, con posible head-of-line blocking. Medir latencia y jitter antes de optimizar.

WebRTC DataChannels podría reducir el uso del relay y ofrecer modos no ordenados/no fiables. No es un reemplazo transparente de sockets: necesitamos mantener semántica TCP donde corresponda, puertos/direcciones virtuales, descubrimiento, desconexiones y seguridad. Requiere señalización, STUN y a veces TURN; no prometer P2P universal ni servidores sin coste.

**Alcance inicial:** navegador ↔ navegador, misma versión/datos, dos jugadores. Cliente nativo, Voobly, compatibilidad con parches múltiples y reconexión de partidas quedan fuera del primer hito.

## Alternativa v86

Si cambiamos de runtime, v86 permite transportar frames Ethernet con `wsproxy`, o conectar instancias en el mismo navegador por `inbrowser`. Es una integración de otra capa, no compatible automáticamente con el gateway de sockets de Boxedwine. No mezclar ambos diseños sin un adaptador explícito.
