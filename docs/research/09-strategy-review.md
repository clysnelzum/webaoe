# 9. Revisión de estrategia con fuentes externas

Consulta: 2026-10-28. Se pausa la repetición de pruebas del juego para revisar alternativas. Esta revisión no ejecutó ninguno de los runtimes alternativos ni descargó imágenes de Windows o juegos de terceros.

## Hallazgo más útil: Wine-Assembly tiene notas específicas de AoE II

- [Proyecto](https://github.com/vgrichina/wine-assembly), [sitio](https://wine-assembly.berrry.app/).
- [Depuración de AoE II Trial](https://wine-assembly.berrry.app/docs/re-notes/aoe2-trial.html), leída completa.
- Revisión consultada del código: `de6dd63aa66e673007fec6b90cc98256246fc762`.
- [Prueba de gameplay](https://github.com/vgrichina/wine-assembly/blob/de6dd63aa66e673007fec6b90cc98256246fc762/test/test-aoe2-gameplay.js).

Es un intérprete x86 y reimplementación Win32 en WebAssembly Text, **no Wine corriendo dentro de Boxedwine**, pese al nombre. El autor documenta mapa jugable de AoE II Trial, interfaz y controles. También describe dos participantes en lobby LAN; eso no certifica una partida sincronizada prolongada. No es evidencia de The Conquerors completo.

Las notas son especialmente valiosas porque registran fallos y falsos positivos: una prueba había aprobado con una captura vieja pese a quedarse en EULA. También documentan 2,72–2,81 cuadros lógicos/s en una VM de cuatro vCPU sin GPU; no extrapolar ese número al Q6600, pero tampoco interpretar «mapa visible» como rendimiento suficiente.

Pistas transferibles, no diagnósticos de nuestro ejecutable:

- `EBUEula.dll` es una carga dinámica que puede faltar aunque no figure en imports.
- El juego mezcla controles GDI y presentación DirectDraw: un campo de nombre puede estar detrás de una capa opaca.
- La presentación del trial usa `Blt` a la primaria. **La ausencia de `Flip` no demuestra que no se presente imagen.**
- Un fallo de temporización/WM_PAINT producía cámara en la niebla, no pérdida del renderer. Fue un bug propio de ese runtime; no copiar el arreglo a Boxedwine sin evidencia.

### Bloqueo potencial para esta máquina

El [código MMX actual](https://github.com/vgrichina/wine-assembly/blob/de6dd63aa66e673007fec6b90cc98256246fc762/src/06c-mmx.wat) utiliza `v128` e instrucciones SIMD reales para operaciones packed. Por tanto **no es un reemplazo sin SIMD demostrado**. Falta verificar si ofrece un artefacto/fallback escalar; no compilarlo entero antes de resolverlo.

## v64: alternativa concreta, pero con nuevos requisitos

- [Repositorio y README](https://github.com/speedyHKjournalist/v64).
- [Guía del proxy gráfico](https://github.com/speedyHKjournalist/v64/blob/master/docs/glbridge.md).

El README enumera AoE II en su showcase. Emula un PC y el proxy gráfico comunica DLLs DirectDraw/Direct3D/OpenGL del invitado con WebGPU. La guía requiere driver del invitado y DLLs; sus scripts apuntan a Windows XP y no certifican Windows 2000. La lista de pruebas de esa guía no enumera AoE II, aunque sí lo hace el README del showcase.

Pendiente: versión del juego, evidencia reproducible, requisitos SIMD del build exacto, disponibilidad real de WebGPU en este equipo, rendimiento y licencias de SO. Que falle WebGPU y vuelva el escritorio a canvas 2D **no significa que el proxy DirectDraw siga funcionando**. No es una sustitución sencilla ni una mejora ya probada.

## js-dos / DOSBox-X

- [Página AoE II en DOS.Zone](https://dos.zone/age-of-empires2).
- [Backend DOSBox-X de js-dos](https://js-dos.com/dosbox-x.html).

Existe una página específica de AoE II. La documentación primaria ofrece `dosboxXWorker`, `dosboxXDirect` y variantes JSPI, y declara soporte para Windows hasta 98/ME y networking. La página del juego por sí sola no identifica el build exacto ni prueba The Conquerors, rendimiento o ausencia de SIMD.

Es una alternativa que merece comprobación de capacidades **antes de preparar otro SO**. No se obtuvieron imágenes preconfiguradas ni archivos del juego del sitio. Windows invitado añade licencias, instalación y coste de emulación.

## Boxedwine/Wine: aclaración del error observado

Se revisaron [surface.c de Wine 11.0](https://github.com/wine-mirror/wine/blob/wine-11.0/dlls/ddraw/surface.c) e [include/wine/wined3d.h](https://github.com/wine-mirror/wine/blob/wine-11.0/include/wine/wined3d.h).

`0x8876086a` corresponde a `WINED3DERR_NOTAVAILABLE` (código 2154). En `ddraw_texture_init`, el fallo al crear la textura de dibujo GPU emite una advertencia y continúa por el camino sin `draw_texture`, creando la textura base. **La advertencia no es por sí sola un retorno fatal.** Esto no demuestra que nuestro framebuffer funcione ni que todas las llamadas posteriores tengan éxito. La fuente es la release estándar Wine 11, no una verificación byte a byte del Wine empaquetado.

La búsqueda también encontró los bugs Wine 34878 (GDI/pantalla negra) y 43627 (regresión gráfica AoE II), con sugerencias históricas opuestas según versión. Las páginas WineHQ devolvieron HTTP 403 al intentar leerlas; se consideran pistas de búsqueda, no una receta validada para Wine 11.

## Decisión provisional y siguiente filtro

No cambiar de motor solo por una descripción, pero tampoco seguir esperando minutos a ciegas en Boxedwine.

1. Comprobar requisitos de los artefactos alternativos (SIMD y, para v64, WebGPU) sin instalar otro toolchain ni SO. Descartar tempranamente lo que no carga en el equipo.
2. Si hay una alternativa compatible, reproducir primero una prueba libre o demo legítima y registrar tiempo hasta gameplay y velocidad de simulación; recién entonces importar la copia privada de The Conquerors.
3. Si se mantiene Boxedwine, hacer una comparación acotada con Wine 6 usando su propio prefijo y estado de usuario, o un probe DirectDraw libre. No mantener un fork grande ni agregar red mientras no haya menú/partida.
4. Separar explícitamente dos metas: funcionar en un navegador moderno en general y funcionar en este Q6600 sin SIMD. No tenemos prueba de que la segunda permita rendimiento jugable con ninguno de los candidatos.

No hay una solución nueva certificada. Sí hay recursos de implementación y depuración mucho más específicos que los de la comparación inicial.
