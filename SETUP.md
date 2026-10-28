# Continuar en otra máquina

Objetivo: reproducir primero el runtime; no presupone que The Conquerors funcione. Estado real: [COMPATIBILITY.md](COMPATIBILITY.md). No se incluyen el juego, Windows ni imágenes Wine. No se modifica el ejecutable ni se eluden protecciones.

## Requisitos

Git, Node.js 20 o superior, npm, Python 3 y Bash (Git Bash en Windows), Chrome/Chromium moderno y espacio para checkout/build. Se usó Node 24 y Chrome 156 en el equipo anterior; otras combinaciones no están certificadas. `playwright-core` **no instala un navegador**. Una CPU/navegador con Wasm SIMD evita el bloqueo observado, pero no garantiza compatibilidad con el juego.

Cloná este repositorio, abrí una terminal en su raíz y ejecutá:

```sh
npm ci --ignore-scripts
npm test
node scripts/check-runtime-capabilities.mjs --chrome '/ruta/al/ejecutable/chrome' --output artifacts/runtime-capabilities
```

En Windows puede usarse `C:/Program Files/Google/Chrome/Application/chrome.exe`. El probe arranca Chrome headless con perfil temporal y guarda `artifacts/runtime-capabilities/report.json`. Comprobar `wasmSIMD: true`; `false` reproduce el bloqueo conocido. No es una prueba del juego. Las rutas de `config.local.example.json` son documentación, **ningún script lee ese JSON**; pasar rutas mediante argumentos. `config.local.json` está ignorado si se quiere guardar notas privadas.

## Preparar Berrry Wine (prioridad)

Elegí un directorio de trabajo **fuera de este repositorio**, sin archivos que se quieran preservar en el destino `berrry-wine`:

```sh
node scripts/prepare-berrry.mjs --work '/ruta/externa/webaoe-work'
```

El script crea un checkout nuevo de `https://github.com/vgrichina/berrry-wine` en `de6dd63aa66e673007fec6b90cc98256246fc762`, con `core.autocrlf=false`, y rechaza destinos existentes. La descarga puede ser grande; si falla, inspeccionar el destino parcial y eliminarlo manualmente solo si corresponde antes de reintentar. No instala dependencias ni toca el juego. Si ya existe un checkout, verificar manualmente revisión y cambios; no borrarlo ni resetearlo.

Seguir los requisitos y licencias del README upstream. En Bash, desde ese checkout limpio:

```sh
npm ci --ignore-scripts --omit=optional
mkdir -p ../logs
set -o pipefail
bash tools/build.sh 2>&1 | tee ../logs/berrry-build.log
```

El build completo ejecuta gates upstream. No asumir éxito si el proceso falla; conservar salida y código de salida. `--ignore-scripts` evita instaladores automáticos de dependencias; si faltan herramientas, documentar el error y revisar instrucciones upstream antes de habilitarlos. Estas instrucciones aún no se probaron de extremo a extremo en la nueva máquina. Evitar cambios en el checkout upstream sin documentarlos.

Después, desde este repositorio, comprobar los módulos realmente construidos:

```sh
node scripts/check-runtime-capabilities.mjs --chrome '/ruta/al/ejecutable/chrome' \
  --wasm '/ruta/externa/webaoe-work/berrry-wine/build/wine-assembly.wasm' \
  --wasm '/ruta/externa/webaoe-work/berrry-wine/build/wine-assembly.compat.wasm' \
  --output artifacts/berrry-capabilities
```

El reporte identifica SHA-256 y éxito o fallo de compilación WASM; no instancia el runtime ni verifica funcionalidad. Para el primer arranque de una aplicación libre, consultar el README y las pruebas upstream y seleccionar un binario con licencia y procedencia verificadas. Guardar pasos, salida y captura; no asumir que cualquier archivo de `test/` es redistribuible.

El README upstream propone `python3 -m http.server 8080`; si se usa para un smoke, restringirlo a loopback: `python -m http.server 8080 --bind 127.0.0.1`. **Nunca servir la instalación privada ni un directorio que la contenga a la red pública.** No subir archivos del juego a servicios externos.

## Instalación propia y primera prueba

La integración para importar y ejecutar la instalación completa en Berrry **todavía no está implementada**. Identificar el ejecutable sin escribirlo:

```sh
node scripts/inspect-exe.mjs --exe '/ruta/privada/Age of Empires II/age2_x1/age2_x1.exe'
```

Comparar hash y tamaño con `COMPATIBILITY.md`; una diferencia implica otra instalación o versión, no necesariamente un problema. No manipular DRM, no aceptar licencias automáticamente, no modificar el binario. Antes de probar el juego, estudiar la API de importación del upstream y asegurar que dependencias, rutas y guardados queden locales. Registrar configuración, hora, resultado, errores y capturas; un framebuffer negro o proceso vivo no es un menú aprobado. No declarar online hasta completar la prueba entre dos computadoras.

## Alternativa Boxedwine

La compilación anterior y sus requisitos están documentados en [docs/research/06-build-progress.md](docs/research/06-build-progress.md) y [07-browser-validation.md](docs/research/07-browser-validation.md), con código upstream fijado en `8790ff20428c22daa64368af9553417e4f499c94`. `scripts/build-boxedwine.sh` está adaptado al Git Bash y SDK del equipo anterior; **no es un instalador portable**. `scripts/prepare-filesystems.py` acepta `--archive` y `--output` y verifica hashes; no proporciona por sí mismo el archivo oficial. Para `npm run dev`, configurar `WEBAOE_WORK` o pasar `--work`; requiere un build y filesystem previamente preparados. No usar configuraciones de EULA copiadas de otra instalación.

## Antes de compartir

`artifacts/`, `config.local.json`, ejecutables, DLL, imágenes y paquetes están ignorados, pero `.gitignore` no es una garantía de privacidad: revisar `git status`, `git diff --cached` y contenido antes de todo commit. Logs pueden revelar rutas o datos personales; sanearlos antes de compartir. No incluir recursos propietarios ni redistribuir dependencias sin revisar licencias. No existe backup en el repo de los logs/capturas privados anteriores: ver rutas en COMPATIBILITY.md y regenerarlos o transferirlos privadamente con autorización.
