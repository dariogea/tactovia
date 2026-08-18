# Entrega Tactovia 0.12.0

Fecha: 18 de agosto de 2026

## Resultado

La versión 0.12.0 aplica el feedback completo de la iteración: inicia la
transición a webapp, mantiene una demo siempre accesible, concentra la analítica
en el partido etiquetado, separa la biblioteca del usuario y rehace el centro de
informes y vídeo. El Playbook y sus componentes se han retirado.

## Cambios entregados

- PWA con manifiesto, service worker y flujos web para vídeo, proyectos y CSV.
- Demo efímera con preferencias limpias.
- Mapa de zonas oculto por defecto y heatmap derivado del etiquetado.
- Controles esenciales por defecto y opciones avanzadas configurables.
- Diez módulos posibles de estadísticas rápidas del partido.
- Estado vacío estricto en Estadísticas cuando no hay partido etiquetado.
- Biblioteca por perfil con carpetas personalizadas y esquema SQLite 4.
- Conclusiones automáticas locales de equipo y jugador con indicador de calidad.
- Dossier visual PDF orientado a gráficos.
- Portal de clips con filtros y reel único de highlights.
- Eliminación de más de 5.000 líneas de lógica, pruebas y documentación del
  Playbook, además de 395 selectores CSS sin uso.

## Verificación

- 41 pruebas superadas y 9 componentes críticos renderizados.
- Base SQLite real validada en Electron.
- Reproducción, búsqueda temporal, velocidad ×2 y reel de highlights validados
  con vídeo real.
- Excel, compilación de producción y revisión visual superados.
- Sin errores ni avisos en la consola del navegador.

## Instaladores

- macOS: `release/Tactovia-0.12.0-mac-arm64.dmg`
  - SHA-256: `a0daba1a3b8f448f15644768485e1873fe5dd2dc84cf4b2114f1e48d9e7a8bf6`
- Windows: `release/Tactovia-0.12.0-win-x64.exe`
  - SHA-256: `fceb76c3adafd9c633f75ac3936f3f68d751aa35b48655698aae506b4114a51d`
- Windows portable: `release/Tactovia-0.12.0-win-x64.zip`
  - SHA-256: `e088abb14eaf7218d200555b8b425b29cc3803aefb7c6476d974ab0ee316bf29`

El DMG está verificado estructuralmente. Los ejecutables siguen sin firma y la
versión de Windows requiere una prueba física antes de distribuirla.
