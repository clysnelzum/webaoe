# 10. Menú original y comienzo de carga con Wine 6 / escritorio 8 bpp

Fecha: 2026-10-29 UTC. **Primer menú de The Conquerors verificado visualmente en este laboratorio.** No es un port terminado ni evidencia de partida jugable.

## Configuración y resultado

Mismo Boxedwine intérprete, commit `8790ff20428c22daa64368af9553417e4f499c94`, Chrome 156, Q6600 sin SIMD, mismo ejecutable SHA-256 `f6c331dd78f5f8a63fbc08f49963733623482c4bd017bfc6426c6971d139a5d1` (recalculado al cerrar). Audio y red desactivados; almacenamiento en memoria. No se modificó el ejecutable ni el original.

Se creó `D:/webaoe-work/game-test/wine6-native-user-state-gdi.zip` con el `user.reg` de **Wine 6**, no el de Wine 11. Se volvió a leer el estado FIRSTRUN=1 del usuario de Windows en esa instalación y se trasladó al overlay. No es un preset general de aceptación de licencias. Se añadieron `DirectDrawRenderer=gdi` y `renderer=gdi` a `Software\\Wine\\Direct3D` del invitado. La receta privada está en `D:/webaoe-work/game-test/private-config/prepare-wine6.py`; no es un requisito que pueda trasladarse automáticamente a otro usuario.

Comparación:

| Prueba | Resultado observado |
| --- | --- |
| Wine 6, overlay ausente por fallo del comando de preparación | 404, Wine no arrancó; no válido para compatibilidad |
| Wine 6, overlay correcto, escritorio 32 bpp, +ddraw,+timestamp, 240 s | Pantalla negra; Blt a primaria 800×600 y cambios de paleta observados |
| Mismo Wine/overlay, 32 bpp, sin traza, 240 s | Pantalla negra |
| Mismo Wine/overlay, **bpp=8**, sin traza, 180 s | **Menú original visible**, colores incorrectos |
| 8 bpp, clic en Un jugador | Submenú original visible, entrada de mouse observada |
| 8 bpp, clic en Partida estándar | Configuración original de partida visible |
| 8 bpp, secuencia tardía y clic en Comenzar partida | Pantalla original **Iniciando una nueva partida**; no apareció mapa antes del cierre |

El cambio de profundidad del escritorio permite presentar imagen en esta configuración. No demuestra una corrección completa de DirectDraw: los colores están fuertemente alterados. Tampoco demuestra si el defecto de paleta está en Wine, X11, conversión del framebuffer o presentación host. No se aplicó un parche de emulación sin diagnóstico causal.

## Reproducción del último intento

Requiere los artefactos privados descritos en el documento 8 y el overlay Wine 6 anterior. El repositorio por sí solo no los contiene. Terminal 1:

```sh
node D:/webaoe-work/Boxedwine/project/emscripten/server.mjs --root D:/webaoe-work/game-test --host 127.0.0.1 --port 8090
```

Terminal 2:

```sh
node scripts/smoke-browser.mjs --url 'http://127.0.0.1:8090/boxedwine.html?root=wine6&overlay=wine6-native-user-state-gdi&app=aoe2&p=age2_x1%2Fage2_x1.exe&w=c%3A%2Ffiles&args=nostartup&bpp=8&sound=false&storage=memory&storageKey=wine6-start-late' --seconds 540 --click 300:370:28 --click 360:600:173 --click 420:120:570 --capture-progress --output artifacts/aoe2-wine6-start-late
```

Cerrar servidor al terminar. Los clics son `segundos:x:y`, relativos al tamaño intrínseco del canvas; el arnés los escala al tamaño CSS y mantiene pulsado 200 ms. Son temporizados, **no detectan pantallas**: revisar capturas para confirmar que cada clic ocurrió en el menú correcto antes de reutilizar la receta. El tiempo de descarga/descompresión/arranque varió mucho entre pruebas.

## Evidencia

Reportes completos y capturas progresivas locales en `artifacts/aoe2-wine6-*`. Resumen saneado derivado de los reportes, con hashes: [wine6-bpp8-runs.json](evidence/wine6-bpp8-runs.json). `harnessCompleted` no es un pass funcional. Los hashes identifican evidencia privada, no permiten reconstruirla desde Git.

La secuencia `aoe2-wine6-start-held` terminó en escritorio azul, pero su menú apareció tarde y los clics previos se habían enviado sobre pantalla negra. Un clic posterior coincidió con Salir. **No clasificarla como crash al iniciar partida.** La secuencia `aoe2-wine6-start` permaneció en configuración; no se confirmó inicio. La secuencia tardía sí alcanzó la pantalla de carga: 2026-10-29T02:31:30Z–02:40:35Z, clic de inicio a 02:38:38Z. Hubo aproximadamente 116 s de observación posterior sin mapa verificado. No alcanza para declarar bloqueo permanente, ni simulación funcionando.

## Próximo diagnóstico

1. Mantener sesión inspeccionable durante carga, con trazas selectivas de archivos/excepciones y progreso, para distinguir carga lenta, espera o fallo. No automatizar más clics a ciegas ni interpretar MIPS como FPS.
2. Aislar paleta con un probe libre DirectDraw 8 bpp y comparar framebuffer/paleta antes y después de conversión host.
3. Confirmar mapa, simulación, input y escaramuza antes de audio/red. Berrry sigue pendiente de máquina con SIMD.
