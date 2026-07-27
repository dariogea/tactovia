# Traspaso ScoutAnalyzer 0.8.0

Fecha: 27 de julio de 2026

## Resultado

La versión 0.8 convierte la interfaz anterior en un flujo de producto completo:
acceso local, selección del deporte, elección de sesión, perfil y ajustes. El
perfil no es una cuenta remota; su contraseña se deriva localmente con PBKDF2,
sal aleatoria y SHA-256, y el registro se conserva únicamente en la instalación
local.

## Etiquetado

- `Canasta` se sustituye por `Canasta de 2P` y `Canasta de 3P`.
- Los proyectos antiguos migran `tag-shot-made` a la etiqueta de 2P sin perder
  eventos.
- Se añade una media pista con diez zonas seleccionables.
- Las etiquetas de tiro exigen seleccionar una zona.
- Cada evento conserva `shotZoneId`, `shotZoneName` y `shotPoints`.
- La edición de eventos permite corregir la zona.
- La tabla abre fichas contextuales al pulsar etiqueta, equipo o jugador.

## Datos y exportación

- SQLite pasa del esquema 1 al 2 mediante una migración aditiva.
- Las zonas se incluyen en CSV, Excel y PDF.
- Excel añade las columnas `Zona de pista` y `Valor de tiro`.
- Informe y exportación incorpora un resumen ejecutivo copiable.
- El catálogo FBRM sube a `2026-27.4`.
- Los 192 perfiles DEMO mantienen identificadores estables, pero ahora presentan
  nombres ficticios realistas y dorsales.
- Todos los equipos conservan escudo oficial o identidad provisional; no existen
  imágenes vacías.

## Organización

- Biblioteca y Equipos/Jugadores se fusionan en `Competiciones y equipos`.
- La exploración agrupa por competición y temporada, con los equipos dentro.
- La edición de equipos y plantillas permanece en la misma pestaña.
- Ajustes se integra en el perfil de usuario.

## Estadísticas y Playbook

- Estadísticas adopta un lienzo tipo Power BI con filtros globales, KPIs,
  evolución, distribución, comparación de equipos y ranking de jugadores.
- `Tiro y zonas` muestra volumen y porcentaje estimado en una pista interactiva.
- Playbook concentra las acciones secundarias en `Más` y permite ocultar la
  biblioteca para trabajar con la pista a pantalla completa.

## Verificación realizada

- 40 pruebas unitarias superadas.
- Nueve componentes y flujos renderizados de forma aislada.
- Base de datos verificada dentro de Electron con esquema 2.
- Reproducción real verificada con salto a 7,25 s, avance hasta 8,45 s,
  velocidad ×2 y peticiones de vídeo por rangos.
- Compilación Vite y empaquetado multiplataforma superados.
- Revisión interactiva en 1280 px de acceso, deporte, sesión, etiquetado,
  estadísticas, mapa de tiro, biblioteca, edición de plantillas, Playbook,
  informe y perfil.
- Tema claro y oscuro comprobados, sin desbordamiento horizontal.
- Sin errores ni avisos en la consola de la interfaz.
- DMG de macOS validado mediante suma interna y versión 0.8.0.
- EXE instalable y ZIP portátil de Windows generados; el paquete interno
  declara la versión 0.8.0. La ejecución física en Windows queda pendiente.
- Aplicación 0.8.0 instalada y abierta en macOS Apple Silicon.
- La base real se copió antes de actualizar y, después de migrar, conserva 20
  equipos, 193 jugadores, 10 partidos, tres análisis y un evento.
