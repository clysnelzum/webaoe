# 8. Depuración de arranque y punto de continuidad

Última actualización: **2026-10-28, 21:48 UTC**. Esta es la nota de continuidad más reciente. Leer después [07-browser-validation.md](07-browser-validation.md).

## Estado al cerrar la sesión

- El usuario **confirmó que esta instalación funciona nativamente**, incluyendo el arranque normal. No se volvió a ejecutar nativamente desde el agente.
- El intérprete WASM propio y Notepad/Wine 11 ya funcionan, con entrada y persistencia probadas en el documento 7.
- Se identificó una diferencia concreta de primera ejecución entre Windows y el prefijo Wine nuevo.
- **AoE II ahora avanza hasta inicializar DirectDraw y superficies de 8 bits**, pero sigue mostrando una pantalla negra. **No se alcanzó ni verificó el menú.**
- No se probó una escaramuza, audio o red multijugador del juego.
- No se modificaron los ejecutables ni la instalación original. Solo copias/overlays de configuración del invitado, fuera de Git.
- No quedaron listeners de prueba en los puertos 8090/8091 al comprobar el cierre.
- Todos los cambios del proyecto siguen **sin commit**. No descartar el trabajo no versionado.

## 1. Estado de primera ejecución observado en Windows

Se consultaron las claves del juego en Windows, solo en lectura. El dato utilizado fue:

```text
HKCU\Software\Microsoft\Microsoft Games\Age of Empires II: The Conquerors Expansion\1.0\EULA
FIRSTRUN = 1 (REG_DWORD)
```

El ejecutable contiene la ruta de esa clave y el módulo `EBUEulaX.dll` contiene el nombre `FIRSTRUN`. El `user.reg` del filesystem Wine 11 base no contenía esa sección.

Se decidió **trasladar el estado ya existente de esta instalación/usuario**, no inventar un estado de aceptación universal ni pulsar un diálogo legal en nombre del usuario. No hacer un preset que marque licencias aceptadas para cualquier instalación futura. El registro de Windows no se escribió.

### Primer método fallido: `reg.exe`

Se creó este artefacto privado:

```text
D:/webaoe-work/game-test/native-first-run.zip
  home/username/run-aoe2.bat
```

El BAT ejecuta `reg add`, `reg query`, cambia a `C:\files` y lanza el juego. **El intento no importó el valor:** aunque `reg.exe` existe en el ZIP Wine, no arranca en ese filesystem reducido:

```text
wine: failed to start L"C:\windows\system32\reg.exe": c0000135
```

Esto es importante: **no interpretar `native-first-run.zip` como configuración funcional**. Los presets `registry=gdi` del shell upstream también dependen de `reg.exe`; no asumir que funcionan con esta imagen.

Reporte/captura: `artifacts/aoe2-native-first-run/`.

### Segundo método: overlay del registro Wine antes del arranque

Se extrajo `home/username/.wine/user.reg` del filesystem Wine 11 **base**, se conservó su contenido y se añadió únicamente:

```text
[Software\\Microsoft\\Microsoft Games\\Age of Empires II: The Conquerors Expansion\\1.0\\EULA]
"FIRSTRUN"=dword:00000001
```

El fichero modificado se empaquetó en:

```text
D:/webaoe-work/game-test/native-user-state.zip
  home/username/.wine/user.reg
```

El shell monta los overlays antes del filesystem base, por lo que la nueva configuración está disponible antes de ejecutar Wine, sin necesitar `reg.exe`.

**Resultado:** el trazado registra que `EBUEulaX.dll` se descarga y el juego continúa con carga de idioma, DirectDraw, entrada, audio y enumeración DirectPlay. El framebuffer pasa de azul a negro. Esto demuestra progreso respecto del prefijo sin ese estado; no demuestra que la ruta de EULA se renderice correctamente.

Reporte/captura: `artifacts/aoe2-user-state/` (100 s, trace process/loaddll/seh).

## 2. Renderer: GDI frente al predeterminado

Con el estado de usuario trasladado y renderer predeterminado aparecieron errores concretos:

```text
Failed to load libEGL.so.1
Failed to load libGL: libGL.so.1
OpenGL support is disabled.
Failed to find a suitable pixel format.
```

La imagen Wine 11 de 47 MiB es reducida y no tiene las bibliotecas GL ni el directorio de overrides WebGL que espera el build actual. **No asumir que esa imagen sirve para cualquier juego porque Notepad funcione.**

Para probar el camino 2D GDI documentado por upstream se creó otro overlay, basado en el anterior, agregando:

```text
[Software\\Wine\\Direct3D]
"DirectDrawRenderer"="gdi"
"renderer"="gdi"
```

Artefacto privado:

```text
D:/webaoe-work/game-test/native-user-state-gdi.zip
```

Se usaron ambos valores porque son los que define el preset `gdi` de `project/emscripten/boxedwine-shell.js` (Wine antiguo/nuevo). Se aplicaron offline ya que `reg.exe` falla. No se cambió el renderer de Windows ni se modificó upstream.

Resultados:

- Prueba de 120 s: pantalla negra, sin menú.
- Prueba posterior de 180 s con `WINEDEBUG=+ddraw`: hay actividad DirectDraw detallada, todavía sin imagen del menú.
- Wine registra `Disabling 3D support.` con este renderer, lo cual es esperable para la prueba 2D, no una solución de Direct3D.

Reportes: `artifacts/aoe2-user-state-gdi/` y **`artifacts/aoe2-gdi-ddraw/`**.

## 3. Evidencia de la última prueba DirectDraw

Última prueba: `2026-10-28T21:44:09Z` a `21:47:11Z`, 180 s de observación configurados tras DOMContentLoaded.

Datos extraídos de `artifacts/aoe2-gdi-ddraw/report.json`:

```text
SetCooperativeLevel returning DD_OK
SetDisplayMode ... width 800, height 600, bpp 8
CreatePalette ... Created palette
DDSCAPS_PRIMARYSURFACE
SetPalette ...
warn:ddraw:ddraw_texture_init Failed to create draw texture, hr 0x8876086a.
```

Se observan superficies offscreen de 64×64, con `DDSCAPS_SYSTEMMEMORY`, pitch 64 y formato `DDPF_PALETTEINDEXED8`. En el reporte hay 19 llamadas a `ddraw_surface1_Lock` y 19 a `ddraw_surface1_Unlock`, además de `Blt` y color keys. Las últimas llamadas trazadas son `GetDC`/`ReleaseDC` sobre una superficie.

**No aparecen llamadas `Flip` en ese reporte.** Hay 24 advertencias `Failed to create draw texture` (comprobar el reporte original si se necesita un recuento exacto), con `hr 0x8876086a`. No se ha identificado aún el significado/causa exacta de ese HRESULT en esta ruta ni si es fatal o un fallback esperado de GDI.

No afirmar que el proceso está muerto: sigue generando contadores MIPS y realizando algunas llamadas. Tampoco afirmar que está jugando “solo con pantalla negra”. El menú y la simulación no están verificados. Las trazas reducen el rendimiento; los tiempos no constituyen un benchmark limpio.

### DirectPlay

En el intento con renderer predeterminado hubo `DPERR_UNAVAILABLE`, falta de service providers y fallos de providers de módem/serie. La red del runtime está desactivada intencionalmente. No tratar esos mensajes como prueba de que se necesite un servidor para ver el menú ni habilitar networking para silenciarlos. El multijugador sigue siendo otra etapa.

## 4. Reproducir exactamente el último intento

En el equipo actual, **los artefactos externos ya existen**. Desde el repositorio:

Terminal 1:

```sh
node D:/webaoe-work/Boxedwine/project/emscripten/server.mjs --root D:/webaoe-work/game-test --port 8090
```

Ese servidor escucha por defecto en `127.0.0.1`. **No pasarlo a `0.0.0.0`**: la carpeta contiene una copia privada del juego.

Terminal 2, en `D:/git/clysnelzum/webaoe`:

```sh
npm run smoke:browser -- --url "http://127.0.0.1:8090/boxedwine.html?root=wine11&overlay=native-user-state-gdi&app=aoe2&p=age2_x1%2Fage2_x1.exe&w=c%3A%2Ffiles&args=nostartup&sound=false&storage=memory&storageKey=aoe2-gdi-ddraw&env=%22WINEDEBUG:+ddraw%22" --seconds 180 --output artifacts/aoe2-gdi-ddraw-repeat
```

Cerrar el servidor con Ctrl+C. El arnés cierra su Chrome temporal al terminar. Un reporte `completed=true` solo indica que terminó el arnés: **no es un pass funcional del juego**.

### Parámetro `env`: advertencia

La versión actual de `getEnvProp` upstream no decodifica bien separadores codificados. Con `%3A` falla con un TypeError antes de Wine. Conservar la forma literal:

```text
env=%22WINEDEBUG:+ddraw%22
env=%22WINEDEBUG:+process,+loaddll,+seh%22
```

No convertir los `:`/`+`/`,` interiores con `URLSearchParams` sin corregir antes ese parser. Las comillas exteriores están codificadas como `%22`. Ver documento 7 para el fallo previo.

## 5. Qué mirar al retomar

1. **Último reporte y captura:** `artifacts/aoe2-gdi-ddraw/report.json` y `screen.png`. Comparar con `aoe2-user-state`, no con el antiguo escritorio azul.
2. Investigar el camino DirectDraw paletizado de 8 bits: superficie primaria, presentación GDI, `GetDC/ReleaseDC`, `SetPalette`, advertencias de texturas y relación con framebuffer del navegador.
3. Distinguir si el juego está cargando recursos lentamente, esperando un evento/diálogo o dibujando sin presentación. Más tiempo de espera solo tiene sentido con telemetría de progreso; no repetir ventanas arbitrarias sin evidencia.
4. Probar un programa libre mínimo de DirectDraw 8bpp/GDI que reproduzca el fallo antes de tocar el juego o mantener un fork grande.
5. Evaluar una imagen Wine más completa si las dependencias ausentes explican el problema; no volver a pedir por defecto el ZIP de 205 MiB del servidor lentísimo sin buscar alternativas.
6. Si se compara Wine 6, generar su overlay a partir de **su propio `user.reg`**, no usar el registro entero de Wine 11 como si fueran intercambiables.
7. No avanzar todavía con salas, WebRTC ni protocolo DirectPlay hasta alcanzar menú y escaramuza.

## 6. Inventario de rutas

| Ruta | Contenido |
| --- | --- |
| `D:/git/clysnelzum/webaoe` | Proyecto, scripts, notas, dependencias de pruebas |
| `D:/webaoe-tools/emsdk` | Emscripten 5.0.7, Python y Node del SDK |
| `D:/webaoe-tools/msys-make` | GNU Make MSYS 4.4.1 |
| `D:/webaoe-tools/emsdk/mingw/7.1.0_64bit` | Toolchain MinGW instalado durante exploración; solo target 64 bits (`gcc -print-multi-lib` devuelve `.;`), no asumir que puede compilar un probe Win32 de 32 bits con `-m32` |
| `D:/webaoe-work/Boxedwine` | Checkout upstream fijado, sin cambios versionados |
| `D:/webaoe-work/Boxedwine/project/emscripten/Build/Release` | Runtime propio y Wine para smoke de Notepad; **sin el ZIP del juego** |
| `D:/webaoe-work/filesystems` | Wine 6/Wine 11 verificados y restos parciales inválidos del ZIP grande |
| `D:/webaoe-work/downloads/Boxedwine26R1Web.zip` | Paquete oficial completo de GitHub, verificado |
| `D:/webaoe-work/game-test` | Runtime copiado, `aoe2.zip`, imágenes Wine, overlays experimentales y manifiesto privado |
| `D:/webaoe-work/game-test/private-config/run-aoe2.bat` | Intento fallido por `reg.exe`; no es el launcher funcional de la prueba más reciente |
| `D:/webaoe-work/logs` | Logs de instalación, compilación y servidores |
| `D:/AOE2/Age of Empires II - The Age of Kings` | Instalación original que el usuario confirmó funcional; solo leer |
| `artifacts/` | Reportes y capturas completos locales, ignorados por Git |

No añadir a Git los archivos propietarios, imágenes Wine, SDK, ZIP del juego o reportes que contengan datos personales. Los artefactos privados necesarios para repetir los últimos intentos permanecen en el disco, no en el repositorio público.
