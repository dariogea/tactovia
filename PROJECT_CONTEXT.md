# Contexto permanente de Tactovia

Última actualización: 18 de agosto de 2026
Versión estable: 0.12.0

## Producto

Aplicación React/Vite disponible como Electron para macOS Apple Silicon y
Windows x64, con una primera base PWA instalable. Analiza vídeo local de
baloncesto, etiqueta acciones, administra una biblioteca privada y genera
estadísticas, conclusiones, datos y vídeo.

## Estado funcional

- Perfiles locales separados y acceso demo sin registro.
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
- PDF interpretativo, PDF visual apaisado, CSV, Excel y modelo para Power BI.
- Portal de vídeo con filtros, selección, agrupación, orden, tres calidades,
  clips independientes y reel único de highlights.
- Cuatro paletas; tema automático, claro y oscuro.
- El Playbook se retiró deliberadamente de 0.12 para concentrar el MVP en
  scouting y análisis.

## Webapp

- Manifiesto PWA, metadatos de instalación y service worker de shell offline.
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

## Entregables 0.12.0

La carpeta `release` contiene únicamente:

- `Tactovia-0.12.0-mac-arm64.dmg`
- `Tactovia-0.12.0-win-x64.exe`
- `Tactovia-0.12.0-win-x64.zip`

Cada empaquetado elimina versiones anteriores, blockmaps y carpetas
intermedias.

## Verificación de 0.12.0

- 41/41 pruebas automáticas.
- 9 componentes críticos renderizados.
- SQLite Electron real:
  `DATABASE_OK version=4 teams=2 players=1 matches=1 events=1 histories=1 video=excluded privacy=private`.
- Vídeo y reel FFmpeg reales:
  `VIDEO_SEEK_OK duration=12.00 seek=7.25 playback=8.46 rate=2x ranges=1 highlights=255346`.
- Excel real generado correctamente.
- Compilación Vite superada: 368.86 kB de JS y 127.11 kB de CSS antes de gzip.
- Acceso, demo, etiquetado, estadísticas, biblioteca e informes revisados en
  navegador sin errores ni avisos de consola.
- DMG validado por `hdiutil`; EXE y ZIP revisados estructuralmente.
- Windows sigue pendiente de prueba física y los instaladores no están firmados.

## Referencias activas

- Resultado: `TRASPASO-TACTOVIA-0.12.0.md`.
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

1. Probar físicamente 0.12.0 en Windows x64.
2. Validar los flujos con entrenadores y corregir fricción real de uso.
3. Definir backend, organizaciones, roles, privacidad y sincronización.
4. Diseñar autenticación real para publicar la webapp.
5. Investigar etiquetado asistido por IA con revisión humana obligatoria.
6. Firmar y notarizar instaladores antes de distribución comercial.
