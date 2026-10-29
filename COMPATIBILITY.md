# Compatibilidad: The Conquerors original

Actualizado: 2026-10-29 UTC. Resultado: **menú original y configuración de partida verificados con Wine 6 y escritorio 8 bpp; paleta incorrecta**. Se alcanzó «Iniciando una nueva partida», sin mapa verificado. No hay partida completa ni multijugador certificado. Evidencia y reproducción: [prueba Wine 6 / 8 bpp](docs/research/10-wine6-bpp8.md).

## Instalación examinada

`D:/AOE2/Age of Empires II - The Age of Kings/age2_x1/age2_x1.exe`, lectura solamente: 2.695.213 bytes, SHA-256 `f6c331dd78f5f8a63fbc08f49963733623482c4bd017bfc6426c6971d139a5d1`. El hash se volvió a calcular; identifica este archivo, no demuestra autenticidad ni versión de parche. FileVersion y ProductVersion registrados previamente: `00.07.22.0627` y `2.1`. El usuario confirmó previamente su funcionamiento nativo; el agente no lo reprodujo nativamente.

Inspección de cabecera PE realizada en esta sesión: firma PE, machine `0x14c` (x86), magic `0x10b` (PE32), siete secciones. Tabla de imports estáticos: `VERSION.dll`, `MSVFW32.dll`, `WINMM.dll`, `KERNEL32.dll`, `USER32.dll`, `GDI32.dll`, `DPLAYX.dll`, `DSOUND.dll`, `DDRAW.dll`, `IMM32.dll`, `ADVAPI32.dll`, `ole32.dll`, `WSOCK32.dll`. La tabla no identifica todas las cargas dinámicas ni las funciones efectivamente utilizadas. Trazas previas registraron además `EBUEulaX.dll`, `language_x1.dll` y RichEdit; no se completó un inventario dinámico exhaustivo.

## Evidencia de ejecución existente

Boxedwine commit `8790ff20428c22daa64368af9553417e4f499c94`, intérprete WASM local, Wine 11 reducido, Chrome en Q6600 sin Wasm SIMD. Con estado de primera ejecución tomado del registro existente del usuario, renderer GDI y audio desactivado, se observó DirectDraw en 800×600×8, paleta, superficies y llamadas Lock/Unlock/Blt; framebuffer negro, sin menú verificado tras 180 s. Las advertencias de textura `0x8876086a` pueden corresponder a un fallback: no está demostrada la causa del fallo. Con renderer predeterminado faltaban `libEGL.so.1` y `libGL.so.1`. `reg.exe` falló con `c0000135` en el filesystem reducido. DirectPlay registró proveedores no disponibles con red del invitado desactivada; no demuestra la causa de la pantalla negra.

Logs y capturas locales, ignorados por Git: `artifacts/aoe2-gdi-ddraw/report.json`, `artifacts/aoe2-gdi-ddraw/screen.png`, `artifacts/aoe2-user-state/` y `artifacts/aoe2-trace/`. Procedimiento reproducible exacto y limitaciones: [handoff](docs/research/08-startup-debugging-handoff.md); corrección sobre el HRESULT y comparación de alternativas: [revisión](docs/research/09-strategy-review.md). Los logs pueden incluir datos privados; revisar antes de compartir. La prueba de Notepad, guardado y recarga sí pasó, pero no valida el juego: [evidencia](docs/research/07-browser-validation.md).

| Función | Estado |
| --- | --- |
| Carga del ejecutable y actividad DirectDraw | Observadas; sin confirmar presentación correcta |
| Menú y mouse en menús | Verificados visualmente con Wine 6 / bpp=8; submenú y configuración responden |
| Gráficos completos | No: paleta incorrecta; mapa no verificado |
| Audio, música, IA, campañas, editor, guardado del juego | No verificados |
| DirectPlay, conexión, sincronización y partida entre computadoras | No verificados |
| Rendimiento jugable | No medido |

## Berrry Wine y alternativas

[berrry-wine](https://github.com/vgrichina/berrry-wine) declara rutas de inicio o gameplay para Age of Empires y una LAN virtual para otros juegos; eso no demuestra The Conquerors ni online. Las [notas específicas de AoE II Trial](https://wine-assembly.berrry.app/docs/re-notes/aoe2-trial.html) documentan gameplay y experiencias de lobby, no una partida prolongada de nuestra edición. El código MMX de la revisión investigada usa Wasm SIMD; falta demostrar un fallback escalar para este equipo. No se ha ejecutado este ejecutable en Berrry Wine. Boxedwine es una comparación real ya efectuada, no prueba de inviabilidad de Berrry Wine. El URL indicado `github.com/boxedwine/boxedwine` devolvió 404 al consultarlo; el checkout probado corresponde a [danoon2/Boxedwine](https://github.com/danoon2/Boxedwine). v86 no fue probado con el juego.

### Prueba concreta de Berrry Wine en este equipo

El checkout `de6dd63aa66e673007fec6b90cc98256246fc762` se obtuvo en `D:/webaoe-work/berrry-wine`. El compilador upstream `node tools/build-compile-wat.js` generó en memoria los dos módulos, pero la validación Node falló en el primero con `Wasm SIMD unsupported @+205`; no escribió artefactos. El primer intento también falló por conversión automática CRLF de Git, corregida configurando `core.autocrlf=false` en ese checkout. Logs locales: `D:/webaoe-work/logs/berrry-compile-probe.log` y `berrry-compile-probe-lf.log`.

Para verificar ambos módulos en Chrome, se invocó directamente `watxSourceClosure`/`compileClosure` y la transformación `dispatch-trampoline` upstream, sin gates del build ni sección de layout; son **artefactos de diagnóstico, no builds certificados ni aptos para ejecutar**. Chrome headless 156 rechazó ambos con `WebAssembly.compile(): Wasm SIMD unsupported @+205`: tail SHA-256 `f3f3cd439c50a2bc441de67c5f138e32cc060186d84d37d85de2b200ca806d75`; compat SHA-256 `24dee19e4642778293e82560382f41970e3c00177a714780c00b245128fede6f`. Repetir la validación con `node scripts/check-runtime-capabilities.mjs --wasm D:/webaoe-work/runtime-review/berrry-tail.wasm --wasm D:/webaoe-work/runtime-review/berrry-compat.wasm --output artifacts/berrry-capabilities`. Reporte: `artifacts/berrry-capabilities/report.json`; generación: `D:/webaoe-work/logs/berrry-ungated-probe.log`. La variante compat elimina tail calls, no SIMD. Esto bloquea estas variantes en este equipo, no demuestra inviabilidad general ni ausencia de otro fallback.

No se modificó el ejecutable ni se realizaron operaciones para eludir protección anticopia. Se realizaron nuevas comparaciones Wine 6 / profundidad de escritorio, documentadas en el [informe 10](docs/research/10-wine6-bpp8.md). Los resultados de Wine 11 arriba son históricos.
