# webaoe
An Age of Empires II web build.

## Investigación y planificación

Ver [SETUP.md](SETUP.md) para continuar en otra máquina. Los resultados están en
[COMPATIBILITY.md](COMPATIBILITY.md), el plan en [PLAN.md](PLAN.md), y las
fuentes y antecedentes en [docs/README.md](docs/README.md).

## Estado actual

- Boxedwine (intérprete) compilado localmente y probado en Chrome sobre un Q6600 sin Wasm SIMD.
- Notepad de Wine 11: entrada de teclado, guardado y persistencia tras recargar verificados.
- The Conquerors: **menú original, submenú y configuración de partida visibles** con Wine 6 / escritorio 8 bpp; paleta incorrecta. Se alcanzó la pantalla de carga, no el mapa.
- Reproducción y límites: [prueba Wine 6 / 8 bpp](docs/research/10-wine6-bpp8.md).
- Audio y multijugador del juego: pendientes.

Ver [resultados y evidencia](docs/research/07-browser-validation.md).

## Prueba local en el equipo preparado

```sh
npm ci --ignore-scripts
python scripts/prepare-filesystems.py
npm run dev
```

Abrí el URL de Notepad que imprime el servidor. Ctrl+C para detenerlo.

Esto requiere las herramientas, el checkout compilado y el paquete oficial externo
que se prepararon en `D:/webaoe-tools` y `D:/webaoe-work`.
No es una instalación automática desde cero ni incluye archivos de Age of Empires.
El servidor escucha únicamente en loopback y la prueba no habilita la red del invitado.
