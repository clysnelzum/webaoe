# 2. Boxedwine: compilación y despliegue

Base inspeccionada: `8790ff20428c22daa64368af9553417e4f499c94`, 2026-10-28.
Estado: revisión de código y pruebas JS; **sin compilación WASM ni juego ejecutado**.

## Toolchain

El build web usa GNU Make, Emscripten (`emcc`/`em++`), SDL2 y zlib. No es un proyecto que requiera CMake para este target. El makefile contiene lógica POSIX para detectar núcleos; una máquina Linux o entorno Linux preparado es la ruta inicial propuesta. En el Q6600 no asumir disponibilidad de WSL2/Docker: verificar requisitos de CPU/virtualización antes de elegir esa vía. Un runner remoto de build podría evitar cargar esa máquina.

La guía upstream indica activar emsdk y ejecutar Make desde `project/emscripten`. **No fija una versión exacta de SDK.** Un comentario de Jenkins menciona emrun 5.0.7, lo cual no basta para afirmar que sea la versión requerida por este commit.

Procedimiento propuesto (NO ejecutado):

```sh
git clone https://github.com/danoon2/Boxedwine.git
cd Boxedwine
git checkout 8790ff20428c22daa64368af9553417e4f499c94
# Instalar/activar emsdk por separado; registrar su versión exacta.
source /ruta/emsdk/emsdk_env.sh
emcc --version
node --version
cd project/emscripten
make release
# En una segunda prueba, sobre el mismo checkout/toolchain:
make jit
```

El makefile administra paralelismo según CPU. Antes de compilar en 8 GB, revisar y limitar su concurrencia si hace falta; no asumir que un `-j` externo prevalece sobre esa lógica.

Registrar: commit, SDK/Clang/Binaryen/Node, SO, flags, `SOURCE_DATE_EPOCH`, log, tiempo y hashes SHA-256 de salidas. No usar artefactos anónimos de mirrors. Los comandos de esta página son un procedimiento candidato, no una receta ya validada.

## Modalidades observadas

| Target | CPU | Hilos host | SIMD explícito | Salida |
| --- | --- | --- | --- | --- |
| `release` | Intérprete | Un hilo del runtime | No en flags inspeccionados | `Build/Release` |
| `jit` | JIT WASM | Un hilo del runtime | `-msimd128` | `Build/Jit` |
| `multiThreaded` | Intérprete | pthreads | No en flags inspeccionados | `Build/MultiThreaded` |
| `multiThreadedJit` | JIT WASM | pthreads | `-msimd128` | `Build/MultiThreadedJit` |

«Un hilo» aquí no significa que el juego carezca de threads invitados; el runtime puede planificarlos cooperativamente. Tampoco implica que una variante con muchos workers acelere necesariamente este juego.

Los cuatro targets comienzan con **512 MiB de memoria WASM** y permiten crecimiento hasta **3 GiB**. No es RAM total del proceso: archivos, ZIP, buffers JS, gráficos, workers y compilador consumen memoria adicional.

### Requisitos del navegador

La guía específica actual documenta excepciones WASM estandarizadas (`exnref`), con Chrome/Edge 137+, Firefox 131+ o Safari 18.4+. Son requisitos documentados, no una matriz probada por webaoe. El makefile también usa `-mtail-call`; auditar todas las capacidades del artefacto final.

Los targets pthreads necesitan `SharedArrayBuffer`, contexto seguro y aislamiento cross-origin. El audio AudioWorklet también aprovecha SharedArrayBuffer aun en builds de un hilo, con fallback SDL.

Para el Q6600: el fallo SIMD del sitio externo es una observación; la alternativa interpretada es una hipótesis a probar. **No basta quitar `-msimd128` al JIT**: genera módulos con instrucciones SIMD en `source/emulation/cpu/wasm/`. Además del módulo inicial, habría que considerar los generados dinámicamente. No prometer un JIT sin SIMD con solo cambiar un flag.

## Servidor de desarrollo

El upstream trae `project/emscripten/server.mjs`. Acepta `--root`, `--port`, `--host` y por defecto escucha en `127.0.0.1:8000`.

Después de compilar, desde `project/emscripten`:

```sh
node server.mjs --root Build/Release --port 8000
# Abrir http://127.0.0.1:8000/boxedwine.html
```

**Pendiente de probar con los artefactos compilados.** El servidor resuelve `boxedwine.html` como índice alternativo. Añade:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```

También asigna MIME `application/wasm`. No se observó soporte de peticiones Range en este servidor; no prometer streaming HTTP parcial sin verificar/implementar el despliegue final. No servir el repo entero, el disco ni una carpeta del juego mediante un servidor expuesto.

En producción: HTTPS, WASM y dependencias preferentemente del mismo origen, WSS para gateway, CSP adaptada al runtime, límites de recursos y assets versionados. El servidor incluido es una herramienta de desarrollo, no una auditoría de seguridad aprobada.

## Wine y filesystem: artefacto separado

Compilar el emulador **no produce por sí solo una instalación Wine utilizable**. Hace falta un root filesystem compatible, con Wine, librerías, fuentes y un prefijo configurado.

La guía antigua propone un ZIP base y ZIP de aplicación o un overlay del prefijo. Sirve para entender el esquema, pero incluye rutas de CI HTTP y recetas Wine 6 históricas. No adoptar esos enlaces ni eliminar dependencias antes de validar una base completa.

Selección pendiente:

1. Identificar un filesystem upstream de procedencia verificable y adecuado para web.
2. Registrar versión, tamaño, hash y licencias de su contenido.
3. Arrancar una aplicación libre pequeña con ese filesystem.
4. Probar la instalación de AoE II y mantener el mismo Wine para comparar variantes.
5. Reducir tamaño solo después de ejercitar campañas, editor, guardado y multijugador; un trazado de archivos del menú no cubre todo el juego.

No incorporar una imagen Windows ni un prefijo con datos propietarios al repositorio público. No instalar overrides DLL descargados al azar. Si el juego necesita entradas de registro o archivos del instalador, documentar el requisito y reproducir la instalación legítima; no asumir que copiar `age2_x1.exe` es suficiente.

## Carga local y persistencia

Observado en `boxedwine-shell.js` y probado con entornos JS simulados:

- Importación de carpeta a D: y ZIP a una subcarpeta.
- Protección de extracción contra rutas que escapan de la carpeta de destino en las pruebas incluidas.
- Root Wine y D: con claves persistentes separadas por aplicación/overlay.
- IDBFS con `autoPersist` y sincronización inicial mediante `FS.syncfs(true, ...)`.
- Exportación de archivos y overlays de cambios.
- Modo opcional de carpeta host mediante permisos del navegador.

**Propuesta inicial:** importar a almacenamiento aislado del navegador, no dar escritura sobre la instalación original. Una carpeta host de lectura/escritura es cómoda, pero amplía el impacto de errores y necesita permisos explícitos.

Definir una clave estable por instalación/perfil; no perder acceso a guardados al cambiar el nombre del ZIP o del launcher. Separar datos de juego, prefijo Wine, partidas y caché JIT. La caché JIT upstream tiene versión `v6`; no considerarla una partida guardada ni redistribuir código derivado del juego sin revisión.

Solicitar persistencia con `navigator.storage.persist()` cuando corresponda y mostrar cuota/uso. La concesión no está garantizada y borrar los datos del sitio elimina almacenamiento local. Siempre ofrecer exportación/importación de guardados y verificar escritura completada antes de informar éxito.

## Licencias

Upstream declara GPLv2 para Boxedwine. Al distribuir builds o modificaciones, revisar las obligaciones aplicables de código fuente, avisos y licencias. Wine y cada componente del filesystem tienen sus propios términos. La licencia del frontend webaoe aún debe decidirse; no asumir que separar una página elimina obligaciones del runtime modificado.

Los usuarios aportan su copia del juego; esto no concede automáticamente permiso para redistribuir ejecutables, recursos, claves o imágenes de instalación. No hay mecanismo de elusión de DRM incluido en este plan.
