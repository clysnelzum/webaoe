# 4. Plan de validación y trabajo siguiente

Fecha: 2026-10-28. Ninguna fase de ejecución del juego está aprobada todavía.

## Decisiones provisionales

- Ejecutar el binario original mediante Boxedwine; no reimplementar el motor.
- Empezar con el shell y gateway upstream, sin framework frontend ni lobby propio.
- Fijar commit/toolchain y mantener cambios del runtime separados de la aplicación web.
- Archivos del juego locales y no versionados; no subirlos al servidor para jugar.
- Una única variante de The Conquerors para comparar pruebas. No mezclar HD, DE o UserPatch sin registrar el cambio.
- No considerar obligatorio el Q6600 hasta confirmar el requisito con el usuario. Conservar una vía interpretada de diagnóstico, sin prometer jugabilidad.
- No intentar eludir paywalls de terceros: el servicio será propio.

## Fase 0 — Inventario y protección de datos

Cuando esté instalado el juego, recopilar localmente:

- Ruta y edición/origen de la instalación; idioma y parche.
- Ejecutable realmente usado y su versión/hash SHA-256.
- Inventario relativo de archivos relevantes, tamaños y hashes, sin publicar información personal.
- Prueba nativa de menú, escaramuza con IA y guardado/carga.
- Dependencia de disco, instalador, registro u otro componente.

La ruta típica del ejecutable de expansión es `age2_x1/age2_x1.exe`, pero comprobar la instalación en vez de codificarla como universal. No solicitar claves de producto. Si una edición necesita medios originales o un componente no soportado, registrar el bloqueo; no incorporar un crack como solución implícita.

Antes de importar datos, preparar exclusiones Git y un directorio privado fuera de `public/`. Este proyecto aún no tiene importador; no copiar los archivos al repo mientras tanto.

**Salida:** manifiesto local y caso nativo de referencia. Si el original no funciona nativamente, separar ese problema del navegador.

## Fase 1 — Toolchain y smoke test libre

1. Preparar un checkout fijado de Boxedwine fuera de webaoe.
2. Instalar/activar emsdk en entorno de build elegido, registrando versiones.
3. Compilar `release` y después `jit`, conservar logs y hashes.
4. Obtener un filesystem Wine verificable y revisar sus licencias.
5. Ejecutar Wine Notepad u otra app libre incluida de procedencia conocida.
6. Verificar consola, teclado/ratón, audio con probe libre y persistencia.

**Salida:** página local que arranca un programa sin recursos de AoE. Confirmar requisitos WASM y cabeceras en un navegador real. Fallar aquí evita culpar al juego de problemas de build.

## Fase 2 — Primera escaramuza

Probar con el shell upstream y una copia de trabajo de la instalación:

- Menú y configuración.
- Mapa estándar pequeño, un humano y una IA.
- Selección por arrastre, clic derecho, scroll y atajos.
- Construcción, recolección, combate y cambio de edad.
- Música, efectos y voces.
- Guardado manual, cierre limpio, reapertura y carga.

Comparar `release` y `jit` con idénticos archivos, Wine, resolución y escenario. Cambiar una variable por vez. Probar multithread solo después de tener una referencia. Para MT JIT, comparar `safe-memory=true` ante fallos; upstream documenta que el modo rápido no garantiza por completo orden x86 para accesos ordinarios bajo el modelo de memoria WASM.

**Criterio propuesto:** al menos 15 minutos de partida con controles/audio funcionales y guardado/carga tras recargar la página. No declarar “juego completo” por alcanzar este punto.

## Fase 3 — Cobertura y rendimiento

Matriz que debe ir completándose con resultados reales:

| Caso | Intérprete | JIT | MT JIT | Referencia nativa |
| --- | --- | --- | --- | --- |
| Arranque y menú | Pendiente | Pendiente | Pendiente | Pendiente |
| Escaramuza 1v1 IA | Pendiente | Pendiente | Pendiente | Pendiente |
| Escenario grande y muchas unidades | Pendiente | Pendiente | Pendiente | Pendiente |
| Guardar/reabrir/cargar | Pendiente | Pendiente | Pendiente | Pendiente |
| Campaña y cinemáticas | Pendiente | Pendiente | Pendiente | Pendiente |
| Editor de escenarios | Pendiente | Pendiente | Pendiente | Pendiente |
| Audio continuo y cambios de foco | Pendiente | Pendiente | Pendiente | Pendiente |
| Red dos jugadores | Pendiente | Pendiente | Pendiente | Pendiente |

Registrar CPU/GPU/RAM, navegador exacto, capacidades WASM, runtime y filesystem, resolución, mapa/semilla/IA, velocidad seleccionada y población. Medir arranque frío/caliente, memoria total, pausas, respuesta a entrada y velocidad de simulación. **FPS visuales no equivalen a velocidad de simulación**: contrastar tiempo del juego y tiempo real, considerando la velocidad configurada y la referencia nativa.

Probar pestaña en segundo plano, pérdida de foco, zoom/DPI, pantalla completa, cuota llena, exportación/importación y eliminación del caché JIT sin pérdida de partidas. No prometer sincronización en la nube.

## Fase 4 — Red, de abajo hacia arriba

1. Repetir pruebas JS de transporte/gateway.
2. Usar los probes libres de `network-apps` upstream, después de construirlos, para sockets del invitado real.
3. Dos navegadores con IP virtual distinta en un gateway local.
4. Crear sesión AoE y conectar por IP virtual explícita si el menú lo permite.
5. Probar enumeración/descubrimiento por separado.
6. Jugar al menos 30 minutos con dos humanos y guardar evidencia de ausencia de desync/desconexión observados.
7. Repetir en dos equipos y después en redes distintas, con RTT/jitter/pérdida medidos.
8. Probar más jugadores solo después de validar conexiones entre peers y compatibilidad de versiones.

Ante fallos, conservar llamadas/socket errors, direcciones/puertos, versiones y fase exacta. No registrar paquetes privados de jugadores por defecto ni publicar capturas sin consentimiento.

**Criterio de avance:** la prueba de red del juego funciona sin lobby propio. Las salas y la autenticación vienen después, pero deben estar implementadas y auditadas antes de abrir un servicio público.

## Fase 5 — Producto mínimo

- Importador con validación de edición y diagnóstico útil.
- Adaptador pequeño del runtime (`load`, `start`, `stop`, guardados, logs, configuración de red).
- Assets runtime versionados; archivos propietarios no servidos ni incluidos en builds.
- Guardados exportables y UI de espacio/persistencia.
- Salas privadas aisladas y servidor autoalojable con límites.
- Diagnóstico previo de SIMD, threads, aislamiento y demás requisitos del artefacto final.
- Procedimiento reproducible para distribuir fuente/licencias y actualizaciones.

No escribir aún estos componentes: esperar evidencia de las fases anteriores.

## Pruebas ejecutadas en esta investigación

Entorno: Windows, Bash, Node **v24.21.0**. Fecha: 2026-10-28 UTC.
Checkout externo de Boxedwine, commit `8790ff20428c22daa64368af9553417e4f499c94`, sin modificaciones para las pruebas.

Desde `project/emscripten`:

```sh
node --test \
  boxedwine-net.test.mjs \
  network-gateway.test.mjs \
  boxedwine-shell.test.cjs \
  testBrowserMouseCoordinates.mjs \
  testBrowserMouseButtons.mjs \
  testAudioWorklet.mjs
```

Resultado observado: **exit 0; 87 pruebas, 87 aprobadas, 0 fallidas, 0 omitidas**, unos 16 segundos. [Log completo](boxedwine-tests.log).

El gateway se ejercita con sockets locales reales; shell/cliente/audio/ratón utilizan arneses JS, mocks y pruebas deterministas. No sustituyen compilación C++, navegador real, audio acústico ni partida. No se ejecutó toda la suite upstream ni se validaron los probes Win32/Linux.

## Próxima acción concreta

Preparar entorno de build y el filesystem Wine de prueba. Requiere elegir dónde instalar emsdk y cuánto espacio/CPU dedicar; no se instaló silenciosamente durante la investigación. Cuando el usuario tenga el juego, realizar inventario y baseline nativo sin esperar a tener lobby.
