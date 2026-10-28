# Progreso

## 2026-10-28 UTC

- Revisados estructura del repositorio, notas, logs y checkout externo existente; se conservaron los cambios preexistentes sin commit.
- Confirmados archivo de instalación y SHA-256; examinada cabecera PE e imports estáticos en lectura. Sin modificar el binario.
- Revisada documentación pública de Berrry Wine y estado previo de Boxedwine; no se confunden pruebas de AoE II Trial con The Conquerors.
- `npm test`: 4 pruebas aprobadas. Son pruebas del CLI, no del juego.
- Pruebas previas de Boxedwine y capturas disponibles en `artifacts/`: actividad DirectDraw, pantalla negra, sin menú. No se ejecutó nuevamente el juego en esta sesión: repetir sin instrumentación adicional no aclararía la causa. No se probó Berrry Wine todavía.
- Berrry Wine `de6dd63`: los módulos diagnósticos tail y compat fueron rechazados por Chrome con `Wasm SIMD unsupported @+205`; el build upstream también falló al validar en Node. No se ejecutó el juego con Berrry. Detalles y hashes en COMPATIBILITY.md.
- Incidente: un comando de limpieza dirigido al checkout externo se ejecutó inicialmente desde el directorio equivocado y borró `README.md`, `.gitignore`, `package.json` y `package-lock.json` de este repositorio. README fue restaurado desde su contenido leído; los otros tres, previamente no versionados, fueron reconstruidos a partir de los comandos observados y `node_modules/.package-lock.json`, no recuperados byte a byte. Revisarlos antes de confiar en sus diferencias. Se comprobó `npm test` después de reconstruirlos; no se borraron intencionalmente archivos del juego.
- Preparación para otra máquina: `SETUP.md`, checkout Berrry fijado y no destructivo, verificación de ejecutable en lectura, configuración de ejemplo y pruebas CLI. El flujo completo de build en otra máquina sigue sin probarse.
- Próxima tarea: en máquina con SIMD, ejecutar build completo Berrry y smoke libre; alternativamente instrumentar DirectDraw de Boxedwine o ejecutar un probe libre de 8 bits.

Detalle y fuentes: [COMPATIBILITY.md](COMPATIBILITY.md), [PLAN.md](PLAN.md) y [docs/README.md](docs/README.md).
