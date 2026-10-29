# Investigación y plan de webaoe

Fecha de investigación: **2026-10-28 (UTC)**.

Objetivo: ejecutar **Age of Empires II: The Conquerors clásico completo**, localmente en el navegador, con archivos aportados por cada usuario y multijugador independiente de servicios de pago. No es un clon, ni HD/Definitive Edition, ni streaming de vídeo.

## Documentos

1. [Hallazgos y comparación de runtimes](research/01-runtimes.md).
2. [Boxedwine: compilación, archivos y despliegue](research/02-boxedwine.md).
3. [Multijugador y seguridad del gateway](research/03-networking.md).
4. [Plan de pruebas y próximos pasos](research/04-validation-plan.md).
5. [Fuentes y trazabilidad](research/05-sources.md).
6. [Salida de las pruebas upstream ejecutadas](research/boxedwine-tests.log).
7. [Instalación de herramientas y filesystem alternativo](research/06-build-progress.md).
8. **[Build completado, prueba real en Chrome y primer intento con AoE II](research/07-browser-validation.md).**

9. [Depuración de arranque y continuidad](research/08-startup-debugging-handoff.md).
10. **[Revisión de estrategia: alternativas y fuentes específicas de AoE II](research/09-strategy-review.md).**

11. **[Menú original y carga de partida con Wine 6 / escritorio 8 bpp](research/10-wine6-bpp8.md)** (2026-10-29): actualiza los resultados de pantalla negra anteriores.

## Estado más reciente

- **Build propio del intérprete completado.**
- **Notepad de Wine 11 funciona en Chrome en este Q6600 sin SIMD:** entrada, guardado y restauración tras recarga verificados.
- **The Conquerors tiene menú, submenú y configuración de partida verificados con Wine 6 / escritorio 8 bpp.** La paleta es incorrecta; se alcanzó la pantalla de carga, no el mapa. Wine 11 continúa sin menú verificado (ver documentos 8 y 10).
- Se pausaron los reintentos para revisar alternativas: Wine-Assembly, v64 y js-dos/DOSBox-X. Hay fuentes específicas de AoE II, pero ninguna alternativa está validada en este equipo (ver revisión de estrategia).
- Audio y multijugador del juego siguen pendientes.
- Hay comandos y evidencia en el documento 8. `npm run dev` sirve la prueba de Notepad por loopback; no la instalación del juego.

Las secciones siguientes son una **instantánea histórica de la investigación inicial**, anterior a la instalación y a las pruebas del documento 8.

## Resumen ejecutivo

- **Boxedwine es el primer candidato, no una decisión definitiva.** No se ha ejecutado The Conquerors todavía.
- Su código actual contiene un **JIT x86 → WebAssembly**, cuatro modalidades de build y un **gateway de red con IP virtuales, TCP y UDP**. No hace falta empezar creando todos esos componentes desde cero.
- El README general y algunas guías antiguas contradicen al código actual. Las notas se basan en una revisión fijada por commit y señalan las discrepancias.
- Los builds JIT activan `-msimd128`. El build interpretado `release` no lo activa explícitamente; no se ha compilado ni certificado como alternativa sin SIMD.
- La LAN virtual existente es prometedora, pero **no demuestra compatibilidad con DirectPlay ni con AoE II**. Tampoco es un lobby público seguro y multi-sala listo para desplegar.
- Se ejecutaron **87 pruebas upstream en Node: 87 pasaron, 0 fallaron**. Incluyen transporte, gateway, importación/persistencia simulada, audio y ratón. **No son pruebas del juego ni una ejecución real del emulador WASM en Chrome.**

## Estado y bloqueos

| Área | Estado |
| --- | --- |
| Inspección del repositorio del proyecto | Solo existía README; no hay aplicación todavía |
| Revisión del código de Boxedwine | Hecha sobre `8790ff20428c22daa64368af9553417e4f499c94` |
| Pruebas JS sin compilación | Ejecutadas; log adjunto |
| Toolchain Emscripten | `emcc` no encontrado en PATH durante esta sesión |
| Herramientas de build | `cmake` y `docker` tampoco encontrados en PATH; no prueba que no estén instalados |
| Instalación del juego | Pendiente del usuario |
| Compilación del runtime | No realizada |
| Escaramuza, campañas y guardado reales | No probados |
| Multijugador AoE II entre navegadores | No probado |

No se instalaron SDK, no se modificó configuración del sistema, no se descargaron recursos propietarios ni se publicaron servidores. El checkout upstream usado para inspección y pruebas quedó fuera del repositorio. No se creó un fork ni se copió el motor a este proyecto.

## Criterio de evidencia

- **Observado:** inspección de código o resultado de una prueba ejecutada.
- **Documentado:** afirmación de una fuente externa, no reproducida localmente.
- **Propuesto:** diseño para webaoe, todavía no implementado.
- **Pendiente:** requiere compilación, navegador o instalación del juego.

El próximo hito es una prueba mínima del runtime con una aplicación libre y luego una escaramuza con la instalación del usuario. No construir salas ni una interfaz final antes de demostrar esa viabilidad.
