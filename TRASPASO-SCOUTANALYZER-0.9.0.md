# Traspaso ScoutAnalyzer 0.9.0

Fecha: 27 de julio de 2026

## Resultado

La versión 0.9 refina el flujo de etiquetado, convierte la biblioteca en una
jerarquía navegable y rehace Informes y exportación como un centro de
entregables. Playbook conserva sus funciones sin cambios estructurales en esta
revisión.

## Etiquetado

- Las etiquetas predeterminadas separan canasta y tiro fallado de 2P y 3P.
- Los colores distinguen acierto, fallo, rebote, pérdida, recuperación y
  acciones tácticas.
- Los proyectos anteriores migran `Canasta` y `Tiro fallado` según el valor de
  su zona sin perder eventos.
- La etiqueta 2P/3P debe coincidir con el valor de la zona seleccionada.
- El mapa pasa a una proporción compacta y cuadrada, puede ocultarse o mostrar
  nombres y se configura junto con las etiquetas.
- El doble clic sobre la zona activa elimina la selección.
- El sonido dispone siempre de botón de silencio, barra y porcentaje.
- El espacio bajo los controles muestra acciones, ritmo, etiqueta más usada,
  identificación de jugadores y acceso a la última acción.

## Competiciones, equipos y jugadores

- La biblioteca utiliza desplegables `Competición → Equipo → Plantilla`.
- Los jugadores pueden abrirse desde la plantilla o desde un directorio global.
- La ficha completa incluye identidad, equipo, competición, dorsal, posiciones,
  altura, nacionalidad, estado e histórico.
- `Partidos analizados` oculta los encuentros previstos y muestra únicamente
  partidos vinculados a análisis o acciones.
- La plantilla Excel incluye `Competicion`, `Equipos`, `Jugadores` y
  `CambiosPlantilla`.
- La importación permite altas, bajas y cambios de dorsal o posición.
- El catálogo FBRM pasa a `2026-27.5` para completar las identidades visuales:
  siete escudos oficiales y nueve identidades provisionales diferenciadas.

## Estadísticas, informes y apariencia

- Estadísticas añade una página de calidad con completitud, actividad por
  periodo y lectura automática.
- Informe y exportación se divide en Informe, Datos y Vídeo, cada uno con una
  finalidad y acciones claras.
- Se añaden cuatro paletas: Arena, Océano, Bosque y Violeta.
- Las paletas son independientes de los modos automático, claro y oscuro.
- Se añade entrada directa en modo demo sin crear credenciales.
- Al entrar desde el acceso, la aplicación restablece correctamente el
  desplazamiento al inicio.

## Compatibilidad de datos

- El proyecto local pasa a versión 8; el esquema SQLite permanece en versión 2.
- No se eliminan partidos previstos de SQLite: simplemente dejan de mostrarse
  en el histórico hasta que tengan un análisis.
- Los equipos, jugadores, eventos, análisis y jugadas existentes se conservan.

## Verificación

- 44 pruebas automáticas superadas.
- Diez componentes y flujos principales renderizados de forma aislada.
- Compilación de producción superada.
- Base de datos verificada dentro de Electron:
  `DATABASE_OK version=2 teams=2 players=1 matches=1 events=1 privacy=private`.
- Reproducción real verificada:
  `VIDEO_SEEK_OK duration=12.00 seek=7.25 playback=8.46 rate=2x ranges=1`.
- Revisión interactiva en 1280 y 1024 px, sin desbordamiento horizontal.
- Acceso demo, Etiquetado, doble clic de zona, volumen, Estadísticas, Biblioteca,
  Importación, Informes, Perfil y las paletas clara/oscura comprobados.
- DMG validado con suma interna y versión 0.9.0.
- EXE y ZIP de Windows generados; `app.asar` declara la versión 0.9.0.
- Aplicación instalada y abierta en macOS Apple Silicon.
- Copia previa guardada en
  `Library/Application Support/scout-analyzer/backups/2026-07-27-before-0.9.0`.
- La biblioteca instalada conserva 20 equipos, 193 jugadores y dos acciones.
  Al incorporar el autoguardado significativo actual queda con 12 partidos y
  cinco análisis, sin eliminar registros anteriores.
- La ejecución física del paquete de Windows sigue pendiente de un ordenador
  Windows x64.
