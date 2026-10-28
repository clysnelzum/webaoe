# Plan de trabajo

1. **Diagnóstico inicial:** conservar el inventario y evidencia en [COMPATIBILITY.md](COMPATIBILITY.md). Las dos variantes diagnósticas de Berrry Wine fijadas fallaron por SIMD en este navegador; falta verificar si existe otro fallback. No asumir que esto descarta todas sus configuraciones.
2. Reproducir el bloqueo gráfico con telemetría que distinga espera, avance y presentación; comparar un probe libre DirectDraw 8 bpp con Boxedwine. No corregir sin traza causal. Si Berrry puede ejecutarse, probar la instalación privada intacta en ese runtime y registrar logs y capturas.
3. Tras cada arreglo en compatibilidad, agregar regresión y repetir el escenario; verificar menú, gráficos, entrada, audio, escaramuza, campañas, persistencia y editor con el juego original.
4. Investigar y trazar DirectPlay/Winsock y proveedores realmente usados; evaluar LAN virtual y transporte entre navegadores conservando semántica de paquetes. Solo entonces diseñar salas y relay aislados de archivos propietarios.
5. Probar partida real entre dos computadoras, duración, jugadores, latencia, pérdidas y desconexiones; documentar límites antes de afirmar online funcional. Implementar importación local y publicación respetando licencias.

Cada paso depende de evidencia de ejecución; no sustituir juego ni protocolo. Los artefactos privados permanecen fuera de Git.
