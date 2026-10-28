# 5. Fuentes y trazabilidad

Consultadas durante la investigación de 2026-10-28 UTC. Las páginas externas pueden cambiar. Los enlaces al código principal están fijados al commit observado; no asumir que `master` conserva el mismo comportamiento.

## Fuentes primarias: Boxedwine

Revisión inspeccionada: **`8790ff20428c22daa64368af9553417e4f499c94`**.
Fecha del commit: `2026-10-28T15:00:25Z`.
Mensaje: `Merge pull request #178 from danoon2/feat/optimise-release`.

| Fuente | Evidencia utilizada |
| --- | --- |
| [Repositorio / README](https://github.com/danoon2/Boxedwine/tree/8790ff20428c22daa64368af9553417e4f499c94) | Arquitectura, plataformas, licencia declarada y TODOs; se detectaron descripciones antiguas |
| [Makefile web](https://github.com/danoon2/Boxedwine/blob/8790ff20428c22daa64368af9553417e4f499c94/project/emscripten/makefile) | Targets, SIMD JIT, pthreads, memoria, flags EH/tail calls |
| [Instrucciones específicas web](https://github.com/danoon2/Boxedwine/blob/8790ff20428c22daa64368af9553417e4f499c94/project/emscripten/buildInstructions.md) | Requisitos de navegador, audio, caché JIT, memory ordering |
| [Guía general de compilación](https://github.com/danoon2/Boxedwine/blob/8790ff20428c22daa64368af9553417e4f499c94/docs/How-To-Build-Boxedwine.md) | Toolchain y separación emulador/filesystem |
| [Guía histórica de filesystem web](https://github.com/danoon2/Boxedwine/blob/8790ff20428c22daa64368af9553417e4f499c94/docs/How-To-Create-FileSystem-For-Web.md) | ZIP base/app y prefijos; advertencias históricas, no receta actual validada |
| [Shell JS](https://github.com/danoon2/Boxedwine/blob/8790ff20428c22daa64368af9553417e4f499c94/project/emscripten/boxedwine-shell.js) | Configuración, importación, IDBFS, storageKey, red opcional |
| [Servidor estático](https://github.com/danoon2/Boxedwine/blob/8790ff20428c22daa64368af9553417e4f499c94/project/emscripten/server.mjs) | CLI, MIME y cabeceras cross-origin |
| [Cliente de red](https://github.com/danoon2/Boxedwine/blob/8790ff20428c22daa64368af9553417e4f499c94/project/emscripten/boxedwine-net.js) | Transporte WebSocket y adaptación de sockets |
| [Sockets navegador C++](https://github.com/danoon2/Boxedwine/blob/8790ff20428c22daa64368af9553417e4f499c94/source/kernel/kbrowsersocket.cpp) | Punto de integración invitado/host; identificado, no auditado exhaustivamente |
| [Gateway](https://github.com/danoon2/Boxedwine/blob/8790ff20428c22daa64368af9553417e4f499c94/project/emscripten/network-gateway.mjs) | IP virtual, TCP/UDP, allowlists, dashboard, estado global de peers |
| [Backend JIT](https://github.com/danoon2/Boxedwine/tree/8790ff20428c22daa64368af9553417e4f499c94/source/emulation/cpu/wasm) | Existencia de JIT y emisión SIMD; inspección puntual |
| [Suite gateway](https://github.com/danoon2/Boxedwine/blob/8790ff20428c22daa64368af9553417e4f499c94/project/emscripten/network-gateway.test.mjs) | Pruebas locales ejecutadas |
| [Suite cliente](https://github.com/danoon2/Boxedwine/blob/8790ff20428c22daa64368af9553417e4f499c94/project/emscripten/boxedwine-net.test.mjs) | Pruebas de semántica de sockets ejecutadas |
| [Suite shell](https://github.com/danoon2/Boxedwine/blob/8790ff20428c22daa64368af9553417e4f499c94/project/emscripten/boxedwine-shell.test.cjs) | Pruebas de importación/almacenamiento simulados ejecutadas |
| [Web principal](https://www.boxedwine.org/) | Descripción general; lista de Wine más antigua que el código |
| [Demos](https://www.boxedwine.org/demo/) / [Age of Empires](https://www.boxedwine.org/app/age-of-empires/) | Precedente AoE I; ficha extraída incompletamente, juego no ejecutado |

Se ejecutaron también `testBrowserMouseCoordinates.mjs`, `testBrowserMouseButtons.mjs` y `testAudioWorklet.mjs` del mismo directorio/revisión. Resultado y comando: [04-validation-plan.md](04-validation-plan.md). Evidencia: [boxedwine-tests.log](boxedwine-tests.log).

## Alternativas

- [v86, revisión `cc37f35c43bf14865d74ad76879ecf9410f69eb1`](https://github.com/copy/v86/tree/cc37f35c43bf14865d74ad76879ecf9410f69eb1): README de hardware, SO y build.
- [Red de v86 en esa revisión](https://github.com/copy/v86/blob/cc37f35c43bf14865d74ad76879ecf9410f69eb1/docs/networking.md): diferencias entre inbrowser, wsproxy, wisp y fetch. Se leyó la sección de backends; no se probaron imágenes ni relays.
- [wemu](https://wemu.dev/): HLE Win32 Rust/WASM, objetivos y limitaciones declaradas, ausencia de sonido. Solo web, no auditoría de código.
- [openage](https://github.com/SFTtech/openage): proyecto de reimplementación; no se validó paridad funcional ni un build web.

## APIs y protocolos

- [Emscripten: networking](https://emscripten.org/docs/porting/networking.html): límites de sockets en navegador, WebSockets y proxy POSIX; no garantiza que Boxedwine use ese proxy genérico.
- [Emscripten: pthreads](https://emscripten.org/docs/porting/pthreads.html): SharedArrayBuffer y despliegue con aislamiento cross-origin.
- [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html): referencia de instalación, no ejecutada en esta sesión.
- [Microsoft MC-DPL4CS: Transport](https://learn.microsoft.com/en-us/openspecs/windows_protocols/mc-dpl4cs/e61a374b-be48-42a1-9fd4-c7a6efbd8b4b): transporte del protocolo DirectPlay 4.
- [PCGamingWiki: The Conquerors](https://www.pcgamingwiki.com/wiki/Age_of_Empires_II%3A_The_Conquerors): resultados de búsqueda sobre puertos clásicos. Fuente comunitaria, no verificada con captura propia.
- [MDN: StorageManager.persist](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist): persistencia solicitada al navegador, no garantía de backup.
- [MDN: File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API): acceso local, permisos y almacenamiento privado del origen.

## Precedentes web

- [PES 6 OptiJuegos](https://pes6.optijuegos.net/): FAQ y HTML, versión PSP, afirmaciones de WASM/WebGL2/WebRTC; núcleo no auditado ni juego ejecutado.
- [wasm-revc](https://github.com/origami-ltd/wasm-revc): README revisado; distingue motor reVC del port web y sus términos. No se compiló ni se copiaron componentes.
- [Cyberpunk2077.lol](https://cyberpunk2077.lol/): portada y enlace `/game`; no verificación interactiva.
- [Noticia de Instant Gaming](https://news.instant-gaming.com/en/articles/22666-there-s-a-web-browser-version-of-cyberpunk-2077-now): afirmación periodística de WASM/WebGPU local, no evidencia reproducida.
- [The Conquerors en Retro Online](https://ddyx.me/Windows/Age%20of%20Empires%20II%3A%20The%20Conquerors): página y HTML, rutas dosx/dosx-edge, selección de runtime y tamaño declarado. No identifican por sí solos el motor. Fallo SIMD comunicado por el usuario.

## Límites de la investigación

No se han inspeccionado todos los archivos de los proyectos, auditado su seguridad ni validado todas sus licencias. No se descargó o ejecutó el juego desde sitios de terceros. No hay evidencia propia de una campaña completa o de una partida AoE II en red bajo ninguno de los runtimes.

Las conclusiones y el plan son de webaoe; las fuentes permiten revisar las observaciones técnicas. Los resúmenes automáticos de buscadores se usaron como pistas, no como autoridad para resolver contradicciones con código/documentación primaria.
