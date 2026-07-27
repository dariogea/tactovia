# Contexto permanente de ScoutAnalyzer

Última actualización: 27 de julio de 2026
Versión estable: 0.6.0

## Objetivo

Aplicación de escritorio para analizar vídeos locales de baloncesto, etiquetar
acciones, gestionar equipos y jugadores, generar estadísticas, exportar clips e
informes y diseñar jugadas en un Playbook.

## Estado actual

- Aplicación local para macOS Apple Silicon y Windows x64.
- Electron, React y Vite.
- Biblioteca histórica SQLite con competición, temporada, equipos, plantillas,
  jugadores, partidos, análisis y acciones relacionadas.
- Piloto preparado para Primera División Masculina GESA FBRM 2026/27.
- Importador Excel/CSV con códigos estables y copia de seguridad local.
- Validación de códigos duplicados para impedir que una importación mezcle
  identidades o sobrescriba equipos, jugadores y partidos.
- Identidad del jugador independiente de sus plantillas por temporada.
- Modelo híbrido preparado: catálogo deportivo compartido y análisis privados
  por usuario o club.
- Esquema Supabase/PostgreSQL con cuentas, espacios, roles y seguridad por fila;
  la conexión real permanece pendiente hasta crear el proyecto cloud.
- Equipos y jugadores con fichas rápidas y detalladas, logos y fotografías.
- Partido obligatorio al cargar un vídeo.
- Etiquetas personalizables de instante e intervalo.
- Nota rápida como único descriptor manual de la acción.
- Navegación de vídeo mediante peticiones por rangos.
- Tres controles visibles por defecto: −10 s, reproducir/pausar y +10 s.
- Línea temporal navegable y tabla ordenable.
- Estadísticas de partido, equipo y jugador con gráficos personalizables.
- Exportación CSV/XLSX, clips seleccionados y PDF.
- Playbook 2.0 organizado en Dibujar, Animar, Notas y Presentación.
- Plantillas tácticas, ataque y defensa, acciones temporizadas, fases
  inteligentes, reproducción animada y exportación PNG/PDF/WebM.
- Media pista vertical con parqué, líneas profesionales y migración automática
  de posiciones desde la cancha horizontal anterior.

## Actualizaciones limpias

- Una nueva compilación elimina los instaladores, paquetes desempaquetados y
  metadatos de versiones anteriores.
- `release` conserva únicamente el DMG de macOS, el instalador EXE de Windows y
  el ZIP portátil de Windows de la versión actual.
- macOS mueve a la Papelera otras copias instaladas de ScoutAnalyzer con una
  versión igual o anterior cuando se abre la nueva aplicación instalada.
- Windows actualiza siempre el mismo destino e identificador de instalación.
- El proceso de empaquetado ya no depende de rutas personales del ordenador.

## Verificación estable

- 32 pruebas automáticas superadas.
- Prueba de base de datos dentro de Electron superada:
  `DATABASE_OK version=1 teams=2 players=1 matches=1 events=1 privacy=private`.
- Renderizado aislado de los seis paneles principales superado.
- Prueba multimedia real superada:
  `VIDEO_SEEK_OK duration=12.00 seek=7.25 playback=8.46 rate=2x ranges=1`.
- Compilación de producción 0.6.0 superada.
- Revisión visual completa del Playbook 2.0 superada sin errores de consola.
- DMG 0.6.0 generado, con suma interna válida y paquete confirmado como 0.6.0.
- Aplicación 0.6.0 instalada y abierta desde `/Applications/ScoutAnalyzer.app`.
- La biblioteca real se creó con esquema 1, una competición piloto y el análisis
  local migrado; la copia 0.5.1 se movió a la Papelera.
- EXE y ZIP de Windows 0.6.0 generados y comprobados estructuralmente como x64;
  siguen pendientes de prueba física en Windows.
- La carpeta `release` se redujo de 2,6 GB acumulados a unos 444 MB con tres
  archivos distribuibles.
- La carpeta `release` 0.6.0 contiene únicamente DMG, EXE y ZIP, unos 426 MiB
  en total.

## Referencias

- Historial detallado: `TRASPASO-SCOUTANALYZER-0.6.0.md`.
- Arquitectura de datos: `docs/BASE-DATOS-0.6.md`.
- Feedback comprobado: `docs/FEEDBACK-0.4.md`.
- Atajos: `docs/ATAJOS.md`.
- Guía del Playbook: `docs/PLAYBOOK-2.md`.
- Hoja de ruta: `docs/ROADMAP.md`.

## Protocolo al cambiar de ordenador

1. Antes de trabajar, descargar los últimos cambios del repositorio.
2. Pedir a Codex que lea `AGENTS.md` y este archivo.
3. Trabajar y ejecutar las verificaciones.
4. Actualizar este contexto si cambia el estado estable.
5. Guardar y subir los cambios antes de cambiar de ordenador.

Los vídeos, análisis `.scout.json`, datos locales, `node_modules`, `dist` y
`release` no se suben al repositorio.

## Próximas prioridades

1. Crear el proyecto Supabase del producto y activar autenticación.
2. Conseguir autorización o un canal oficial de datos FBRM.
3. Validar las políticas cloud con usuario, club y administrador.
4. Probar físicamente el instalador, vídeo y exportaciones en Windows.
5. Importar la plantilla real de Primera División Masculina GESA 2026/27.
6. Crear filtros históricos combinados por jugador, equipo y acción.
7. Exportar selecciones como un único vídeo de highlights.
