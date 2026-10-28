# 1. Runtimes y precedentes

Fecha: 2026-10-28. Fuentes identificadas en [05-sources.md](05-sources.md).

## Boxedwine: candidato principal

**Observado en el código:** Boxedwine combina emulación x86, emulación del entorno Linux necesario y Wine de 32 bits. Permite intentar ejecutar el binario Windows original sin reconstruir su simulación. Está escrito principalmente en C++ y dispone de frontend Emscripten.

Revisión inspeccionada: `8790ff20428c22daa64368af9553417e4f499c94`.

En `project/emscripten/` existen:

- Targets `release`, `jit`, `multiThreaded`, `multiThreadedJit`.
- Generación dinámica de módulos WASM y caché JIT.
- AudioWorklet con fallback SDL.
- Importación de carpetas y ZIP, almacenamiento IDBFS y acceso opcional a carpeta del host.
- `boxedwine-net.js`, integración de sockets de navegador y `network-gateway.mjs`.
- Pruebas de regresión de transporte, gateway, UI, audio y entrada.

**Discrepancias documentales:**

- El README todavía dice que el build web necesita un JIT; el makefile y `source/emulation/cpu/wasm/` ya lo contienen.
- La guía histórica de filesystem web dice que no hay aceleración 3D; el árbol actual incluye trabajo WebGL/Wine. No tratar esa frase antigua como descripción exhaustiva del runtime actual.
- La web principal enumera versiones Wine antiguas; el README actual enumera Wine 3.1–11.0. Ninguna de estas listas certifica AoE II.

**A favor:** preserva el motor original; ya hay infraestructura de red; DirectDraw es un camino relevante para un RTS 2D antiguo.

**Riesgos:** Wine y sus providers DirectPlay, temporización, coste de CPU, diferencias entre intérprete/JIT, requisitos WASM modernos, audio y persistencia real. No hay evidencia obtenida en esta investigación de que The Conquerors esté validado en este build web.

La página de Boxedwine lista una demo de **Age of Empires I**. No confundirla con AoE II ni con The Conquerors. La extracción de esa ficha fue incompleta; sirve como pista, no como prueba ejecutada.

## v86: alternativa de emulación de PC completo

Revisión inspeccionada para README y networking: `cc37f35c43bf14865d74ad76879ecf9410f69eb1`.

**Documentado/observado:** emula CPU x86 y hardware de PC, traduce código a WebAssembly en ejecución y tiene VGA/SVGA, NE2000, virtio y SoundBlaster 16. Documenta Windows 95/98/2000 y otros huéspedes.

Posible esquema: juego → Windows 9x o Linux/Wine → PC emulado → navegador.

**Ventaja:** la red puede transportarse como Ethernet virtual y preservar más del comportamiento del sistema invitado.

**Desventajas:** mantener un SO invitado, drivers, disco, arranque y licencias; sobrecoste de emulación y limitaciones de hardware gráfico/sonido. Que Windows arranque no prueba que el juego funcione.

Para multijugador son relevantes `inbrowser` (BroadcastChannel, mismo origen/entorno del navegador) y `wsproxy` (frames Ethernet a un relay). **No elegir `fetch` o `wisp` por asumir que ofrecen una LAN:** la documentación revisada indica aislamiento entre huéspedes; el backend WISP de v86 no implementa UDP en esa revisión y no ofrece los listeners invitados necesarios como una LAN genérica.

Conclusión: plan B si Boxedwine resulta inviable; no construir todavía una imagen Windows.

## wemu: HLE Win32 especializado

La documentación actual describe un runtime Rust/WASM con implementación directa de APIs Win32 (Kernel32, USER, GDI, WinMM, DirectDraw, CRT y COM). **No es v86 + Wine**, aunque un resumen de búsqueda previo lo describiera así.

La web declara incompatibilidades por instrucciones/API faltantes y **salida de sonido no implementada**. No se ejecutó ni se inspeccionó su código en esta investigación.

Conclusión: referencia útil; no candidato principal para la meta de juego completo con audio.

## openage: reimplementación del motor

El proyecto público persigue una implementación libre del motor de Age of Empires. Es útil para comprender formatos y arquitectura, pero **no equivale a ejecutar el binario original ni garantiza equivalencia completa** de campañas, IA, editor y simulación.

No elegirlo para el primer prototipo dado el requisito de conservar el juego completo. No se compiló ni se evaluó su estado funcional en esta sesión.

## Precedentes web citados por el usuario

### PES 6 / OptiJuegos

La web identifica la **versión PSP**, no Windows. Declara WebAssembly, WebGL2 y WebRTC P2P. Usa tanto el término «recompilado» como «emula una consola PSP». Sin auditar el núcleo, no clasificar con certeza el mecanismo de ejecución. Es un precedente de UX/red, no una solución x86 reutilizable por sí misma.

### GTA Vice City / wasm-revc

El README de `origami-ltd/wasm-revc` explica que compila el motor reconstruido reVC con Emscripten y usa archivos del usuario, IndexedDB y WebGL2. La descripción breve menciona WebGPU, en contradicción con ese README; no se verificó el backend en ejecución.

Lo importante: parte de código del motor recuperado previamente, no convierte cualquier EXE automáticamente. Sus términos distinguen el trabajo web del código de reVC; **no asumir una licencia MIT uniforme** ni copiar componentes sin revisión de sus licencias.

### Cyberpunk 2077

Se encontró `cyberpunk2077.lol` y cobertura periodística que afirma ejecución local WASM/WebGPU. La portada contiene un enlace `/game`, pero no se verificó interactivamente y no se obtuvo una cadena reproducible de código/build. No usarlo como garantía técnica ni afirmar sin pruebas que todo es streaming.

### Retro Online / The Conquerors

La página específica carga `emulators.js` desde `/js/dosx/` o `/js/dosx-edge/`, selecciona según navegador y disponibilidad de `WebAssembly.Suspending`, y declara unos 546 MB de datos. No se identificó con certeza el runtime subyacente.

**Prueba del usuario:** falla en Chrome sobre un Q6600 con `Wasm SIMD unsupported`. Esto demuestra un bloqueo de compilación WASM en ese entorno, no corrupción de partidas ni rendimiento medido del juego. No atribuir el runtime a Boxedwine a partir del nombre de las rutas.

No se estudiará cómo quitar la paywall ni se reutilizarán sus archivos del juego. La alternativa es infraestructura propia y archivos aportados por cada jugador.

## Decisión provisional

1. Evaluar Boxedwine fijando commit y toolchain.
2. Usar el shell upstream antes de escribir una interfaz propia.
3. Comparar intérprete y JIT sobre la misma instalación.
4. Aprovechar el gateway existente en una prueba local aislada.
5. Cambiar de runtime solo con un bloqueo reproducible o rendimiento insuficiente documentado.
