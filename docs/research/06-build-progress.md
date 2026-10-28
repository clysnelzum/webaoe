# 6. Preparación de build y filesystem alternativo

Fecha: 2026-10-28. Instantánea durante la preparación. **Actualización posterior:** el build y las pruebas reales están en [07-browser-validation.md](07-browser-validation.md); esta nota conserva el estado intermedio.

## Instalado fuera del repositorio

- `D:/webaoe-tools/emsdk`: SDK Emscripten **5.0.7**, activado sin `--permanent` ni modificación del PATH del sistema. Checkout emsdk `d7b4130688bfa348392b921ab04015aa15c4f154`.
- Incluye Node 24.19.0 y Python 3.13.3 propios del SDK.
- GNU Make **4.4.1**, paquete MSYS2 oficial `make-4.4.1-2-x86_64.pkg.tar.zst`, extraído en `D:/webaoe-tools/msys-make`. SHA-256 del paquete: `2408af61717dae87b00c855b132769a125c708907fc94a46bb16dae076113e5c`.
- Se descargó también MinGW 7.1 mediante emsdk como exploración, pero el build utiliza Make MSYS por su tratamiento de rutas POSIX.
- Checkout de Boxedwine fijado a `8790ff20428c22daa64368af9553417e4f499c94` en `D:/webaoe-work/Boxedwine`.

Se inició el build `release` con dos trabajos. Script: `scripts/build-boxedwine.sh`, ejecutable desde Git Bash. Logs externos: `D:/webaoe-work/logs/build-release.log` y `build-release-driver.log`. SDL2 y zlib se descargaron/compilaron correctamente; se observaron objetos generados. **No se ha confirmado aún el enlace final ni el arranque en navegador.**

## Descarga original demasiado lenta

El filesystem completo `https://boxedwine.org/v2/23/TinyCore15Wine11.0.zip` tiene 215096098 bytes y hash publicado `1a28ec385943fe0decd60d2f9b904a6cfc1ca1ccabc283c5c746a1b95d591d95`. El servidor resultó demasiado lento tanto para el agente como para el usuario. Los intentos parciales **no son una imagen validada**.

## Alternativa oficial ya descargada

La API de GitHub de la release oficial `26R1.0` enumera:

https://github.com/danoon2/Boxedwine/releases/download/26R1.0/Boxedwine26R1Web.zip

- Tamaño observado: **122244710 bytes**.
- SHA-256 calculado localmente: `ebc634e921f7c65980a7094f3efad84873cede8011eb7dd204446ff1de982945`.
- Archivo completo descargado en `D:/webaoe-work/downloads/Boxedwine26R1Web.zip`; se pudo abrir su directorio ZIP y extraer una imagen interna.
- Contiene `SingleThreaded/boxedwine.zip`, `MultiThreaded/boxedwine.zip` y **`Wine11/boxedwine.zip`**. No confundirlos entre sí.

Se extrajo `Wine11/boxedwine.zip` como:

`D:/webaoe-work/filesystems/Wine11-26R1.zip`

- Tamaño: **49320865 bytes**.
- SHA-256 calculado: `5d251b6d53cad1c31de254c5285603d193f91bc3129b9c9ba39c4cc65a24edb3`.
- Contiene 3251 entradas, entre ellas Notepad de Wine, bibliotecas y archivos de versión.

**Es un filesystem alternativo del paquete web oficial, no un mirror byte a byte del filesystem completo v23.** Los hashes anteriores son mediciones locales, no firmas o hashes independientemente publicados por el autor. Su compatibilidad con el checkout actual y su cobertura de dependencias deben probarse. No se necesita descargar el paquete lento para continuar el smoke test de Wine.

Verificación posterior: el campo `digest` de la [API oficial de la release](https://api.github.com/repos/danoon2/Boxedwine/releases/latest) para `Boxedwine26R1Web.zip` coincidió con el hash local del paquete (`sha256:ebc634e921f7c65980a7094f3efad84873cede8011eb7dd204446ff1de982945`). La consulta `latest` es mutable; la release descargada es **26R1.0**. Los hashes internos siguen siendo mediciones locales.

Los binarios, ZIP y toolchains quedan fuera de Git. No se ha incluido ningún archivo de AoE.
