# Contexto permanente de Tactovia

Última actualización: 14 de septiembre de 2026
Versión actual: 0.13.1 · Studio

## Revisión estética 0.13.1

- Balonmano retirado; selector redistribuido en dos columnas.
- Contrastes de texto y acentos corregidos en claro y en las cuatro paletas
  oscuras. Atajos legibles y sin texto lima sobre blanco en la guía.
- Reproductor compacto, volumen con iconos SVG, resumen adaptable sin recortes,
  última acción a ancho completo y avisos detrás de los diálogos.
- Contadores en singular/plural y textos de tiro aclarados.
- Revisión automatizada con capturas a 1440, 1000 y 640 px, temas claro/oscuro,
  cuatro paletas, pestañas, diálogos, nombres largos y final de las pantallas.
- 52 pruebas de lógica; vídeo real y exportación de highlights superados.
- Tema automático comprobado con cambios de preferencia del sistema a claro y
  oscuro; PWA comprobada sin conexión (17 recursos).
- Detalle: `docs/REVISION-VISUAL-0.13.1.md`.
- Instaladores Mac/Windows regenerados; DMG verificado y versión interna
  Windows comprobada. Mac instalado en `/Applications/Tactovia.app`, arranque
  y selector sin Balonmano comprobados. Copia 0.13.0 recuperable en la Papelera.

Las verificaciones y entregables 0.13.0 descritos más abajo son el registro
histórico de la entrega Studio; los instaladores actuales usan 0.13.1.

## Producto

Aplicación React/Vite disponible como Electron para macOS Apple Silicon y
Windows x64, con una primera base PWA instalable. Analiza vídeo local de
baloncesto, etiqueta acciones, administra una biblioteca privada y genera
estadísticas, conclusiones, datos y vídeo.

## Estado funcional

- Rediseño Studio con navegación lateral, inicio del partido y modo de
  concentración. Pantallas verificadas en claro, oscuro y tamaños reducidos.
- Sala de revisión: filtros, favoritos, clips acotados, reproducción continua,
  bucle, listas guardadas y reordenación para exportación.
- Cuaderno del analista en Inicio, guardado con el proyecto y exportado en
  Excel y PDF interpretativo.
- Buscador de comandos Cmd/Ctrl+K y deshacer/rehacer hasta 50 estados de acciones.
- Período real por acción (1–4 y dos prórrogas), nunca estimado por duración del
  vídeo. Los análisis antiguos conservan períodos sin asignar.
- Métricas semánticas editables por etiqueta; cálculo compartido entre interfaz
  y exportaciones. Tiros libres, asistencias, faltas y tapones disponibles.
- Tabla individual; tiros sin zona incluidos en FG/eFG, libres excluidos de
  tiros de campo. La cobertura combina intervalos solapados.
- Cronología con búsqueda, favoritos y paginación de 50 acciones.
- Biblioteca importable/exportable con vista previa, validación y fusión por
  identidad; admite traspasos sin duplicar jugadores.
- Perfiles locales separados y acceso demo sin registro.
- Ejemplo explícitamente ficticio con 64 acciones, 10 jugadores, notas y lista;
  no incluye un vídeo y no escribe el histórico de un perfil.
- Baloncesto activo; otros deportes quedan para fases posteriores.
- Sesión nueva, continuación del autoguardado o apertura de `.scout.json`.
- Proyecto con partido, convocatoria, vídeo, etiquetas, zonas y acciones.
- Estadísticas exclusivamente del partido abierto; no usan registros de la
  biblioteca y muestran estado vacío si aún no existe etiquetado.
- Mapa SVG de diez zonas oculto por defecto, activable desde Ajustes, con
  volumen, acierto y visualización caliente.
- Reproductor inicial con −10 s, reproducción/pausa, +10 s y volumen. Controles
  avanzados, velocidades hasta ×16 y atajos configurables.
- Resumen en directo configurable con diez métricas del etiquetado.
- Biblioteca del usuario separada del proyecto, organizada en carpetas,
  competiciones, equipos, plantillas y agentes libres.
- Centro de informes en cuatro áreas: análisis automático, gráficos, vídeo y
  datos.
- Conclusiones locales de equipo y jugador, sin inventar acciones ni enviar
  información a servicios externos.
- PDF interpretativo con todos los jugadores etiquetados, PDF visual apaisado,
  CSV, Excel con tabla individual y notas, y Power BI con dimensiones,
  identificadores y guía de relaciones. No se genera un PBIX.
- Portal de vídeo con filtros, selección, agrupación, orden, tres calidades,
  clips independientes y reel único de highlights.
- Cuatro paletas; tema automático, claro y oscuro.
- El Playbook se retiró deliberadamente de 0.12 para concentrar el MVP en
  scouting y análisis.
- Protección ante errores de interfaz/IPC, validación de archivos de análisis,
  foco de diálogos, confirmación al cerrar sin guardar y recuperación diferida.
- El cambio de pantalla conserva la posición del vídeo; volver a seleccionar
  su archivo no borra el partido; el mapa oculto no impide etiquetar tiros.

## Webapp

- Manifiesto PWA, icono PNG, metadatos de instalación y service worker con
  precaché real de HTML, JS, CSS y marca. Arranque offline verificado después de
  la primera carga. Vídeos, peticiones por rangos y análisis no se cachean.
- En navegador: vídeo local, etiquetado, apertura/descarga de proyecto JSON y
  CSV.
- En escritorio: SQLite, copias, Excel, PDF, Power BI y codificación FFmpeg.
- No existe aún backend, cuenta remota ni sincronización entre dispositivos.

## Datos y privacidad

- SQLite usa esquema 4.
- `user_libraries` aísla la biblioteca de cada perfil.
- Al guardar un proyecto con partido y acciones se crea una ficha histórica
  privada sin vídeo, ruta ni tiempos de clip.
- `.scout.json` conserva el trabajo editable y recupera etiquetas y estadísticas.
- Se conservan `com.scoutanalyzer.desktop`, `scout-analyzer`,
  `scoutanalyzer.db` y las claves antiguas para no romper instalaciones.
- La migración de proyectos elimina la propiedad obsoleta `playbook` y conserva
  el resto de los datos compatibles.
- El formato de proyecto pasa a versión 11 e incluye `playlists`,
  `analysisNotes`, `period`, `favorite` y `metric`. Se rechazan archivos inválidos,
  identidades duplicadas y versiones futuras, sin sobrescribir el trabajo abierto.
- La biblioteca SQLite se hidrata antes de guardar para evitar sobrescrituras
  en el inicio de sesión. Los identificadores y rutas de almacenamiento previos
  se conservan.

## Entregables 0.13.0

La carpeta `release` contiene únicamente:

- `Tactovia-0.13.0-mac-arm64.dmg` (aprox. 139 MB)
- `Tactovia-0.13.0-win-x64.exe` (aprox. 120 MB)
- `Tactovia-0.13.0-win-x64.zip` (aprox. 167 MB)

La limpieza elimina versiones generadas anteriores, blockmaps y carpetas
intermedias únicamente tras terminar correctamente el empaquetado.

## Verificación de 0.13.0

- 51/51 pruebas automáticas.
- 20 comprobaciones integradas en Electron: acceso, ejemplo, pantallas,
  filtros, vídeo real, tiro sin mapa, período, guardado/apertura, deshacer,
  favoritos, listas, orden de exportación, comandos y tamaños de pantalla.
- 9 componentes críticos renderizados.
- SQLite Electron real:
  `DATABASE_OK version=4 teams=2 players=1 matches=1 events=1 histories=1 video=excluded privacy=private`.
- Vídeo y reel FFmpeg reales:
  `VIDEO_SEEK_OK duration=12.00 seek=7.25 playback=8.45 rate=2x ranges=1 highlights=255346`.
- Excel real: 6 hojas; verificados período, favoritos, puntos y notas. Power BI
  comprobado con dimensiones e identificadores relacionados.
- PDF real generado en las dos modalidades, con comprobación de contenido.
- `PWA_OK offline=true assets=17 demo=true`.
- Compilación Vite superada: 412.93 kB de JS (118.74 gzip) y 167.23 kB de CSS
  (31.17 gzip). Se retiraron 39 reglas de estilos obsoletos.
- Pantallas principales revisadas visualmente en claro y oscuro; Etiquetado a
  1000 px e Inicio a 640 px; sin errores de consola en el recorrido integrado.
- DMG validado por `hdiutil`; ZIP íntegro y EXE identificado como instalador NSIS.
- Versión interna 0.13.0 verificada en los paquetes Mac y Windows; ambos
  contienen el módulo estadístico compartido y el nuevo módulo de informes.
- Windows sigue pendiente de prueba física y los instaladores no están firmados.
- `/Applications/Tactovia.app` actualizado a 0.13.0 y abierto físicamente:
  acceso demo, selección de baloncesto y ejemplo comprobados desde el paquete
  instalado. El perfil existente sigue disponible. No se modificaron sus datos.

## Referencias activas

- Resultado: `TRASPASO-TACTOVIA-0.13.0.md`.
- Guía: `docs/GUIA-USUARIO.md`.
- Atajos: `docs/ATAJOS.md`.
- Base de datos: `docs/BASE-DATOS-0.6.md`.
- Sistema visual: `docs/SISTEMA-VISUAL-0.7.md`.
- Marca: `BRAND_IMPLEMENTATION.md`.
- Hoja de ruta: `docs/ROADMAP.md`.

## Protocolo al cambiar de ordenador

1. Actualizar el repositorio.
2. Leer `AGENTS.md` y este archivo.
3. Trabajar y ejecutar pruebas, base real, vídeo real y compilación.
4. Actualizar este contexto cuando cambie el estado estable.
5. Guardar y subir los cambios.

Los vídeos, análisis, datos locales, `node_modules`, `dist` y `release` no se
suben al repositorio.

## Siguientes prioridades

1. Probar físicamente 0.13.0 en Windows x64.
2. Validar los flujos con entrenadores y corregir fricción real de uso.
3. Definir backend, organizaciones, roles, privacidad y sincronización.
4. Diseñar autenticación real para publicar la webapp.
5. Investigar etiquetado asistido por IA con revisión humana obligatoria.
6. Firmar y notarizar instaladores antes de distribución comercial.
