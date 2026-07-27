# Contexto permanente de ScoutAnalyzer

Última actualización: 27 de julio de 2026
Versión estable: 0.8.0

## Objetivo

Aplicación de escritorio para analizar vídeos locales de baloncesto, etiquetar
acciones, gestionar equipos y jugadores, generar estadísticas, exportar clips e
informes y diseñar jugadas en un Playbook.

## Estado actual

- Aplicación local para macOS Apple Silicon y Windows x64.
- Electron, React y Vite.
- Acceso con perfil y contraseña locales. No se presenta como autenticación
  cloud: el perfil solo protege y organiza esta instalación.
- Al iniciar se selecciona Baloncesto y se elige entre nueva sesión, continuar
  el autoguardado o abrir un archivo.
- Sistema visual 0.7 con navegación flotante, superficies translúcidas,
  controles compactos y jerarquía unificada.
- Temas automático, claro y oscuro; la preferencia se conserva localmente y el
  modo automático responde a Windows o macOS en tiempo real.
- Biblioteca histórica SQLite con competición, temporada, equipos, plantillas,
  jugadores, partidos, análisis y acciones relacionadas.
- Catálogo precargado de Primera División Masculina GESA FBRM 2026/27 con 16
  equipos oficiales, ocho partidos de la primera jornada y códigos FBRM
  estables.
- 192 jugadores ficticios —doce por equipo— con nombres y dorsales inventados,
  identificados como `DEMO`, sin datos personales reales y preparados para
  sustituirse por plantillas oficiales.
- Siete escudos de fuentes oficiales y nueve identidades provisionales con
  trazabilidad explícita.
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
- Etiquetas personalizables de instante e intervalo. Las predeterminadas
  distinguen canasta de 2P y de 3P; la etiqueta antigua `Canasta` migra a 2P
  para conservar sus eventos.
- Mapa interactivo de diez zonas. Cada tiro exige zona y conserva zona, nombre
  y valor en el proyecto, SQLite, CSV, XLSX y PDF.
- Nota rápida como único descriptor manual de la acción.
- Navegación de vídeo mediante peticiones por rangos.
- Tres controles visibles por defecto: −10 s, reproducir/pausar y +10 s.
- Línea temporal navegable y tabla ordenable.
- Tabla de eventos con ventanas informativas de etiqueta, equipo y jugador.
- Estadísticas tipo Power BI con filtros globales, KPIs, evolución, comparación,
  ranking y mapa de tiro con acierto por zona.
- Exportación CSV/XLSX, clips seleccionados, PDF y resumen ejecutivo copiable.
- Playbook 2.0 con menos controles visibles, menú de acciones secundarias,
  biblioteca ocultable y modo concentrado.
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

- 40 pruebas automáticas superadas.
- Prueba de base de datos dentro de Electron superada:
  `DATABASE_OK version=2 teams=2 players=1 matches=1 events=1 privacy=private`.
- Renderizado aislado de nueve paneles y flujos principales superado.
- Prueba multimedia real superada:
  `VIDEO_SEEK_OK duration=12.00 seek=7.25 playback=8.46 rate=2x ranges=1`.
- Compilación de producción 0.8.0 superada.
- Revisión visual del acceso, deporte, sesión, Etiquetado, Estadísticas,
  biblioteca unificada, edición de equipos, Playbook, Informe y Perfil/Ajustes
  en temas claro y oscuro superada a 1280 px, sin desbordamiento horizontal.
- Revisión visual del catálogo en Partidos, Equipos, Jugadores y Administración
  superada con 16 equipos, 192 jugadores, ocho partidos y cero análisis
  artificiales.
- DMG 0.8.0 generado, validado mediante `hdiutil verify` y comprobado
  internamente con versión 0.8.0.
- Aplicación 0.8.0 instalada y abierta en macOS Apple Silicon.
- Copia previa de la base real conservada en
  `Library/Application Support/scout-analyzer/backups/2026-07-27-before-0.8.0`.
- La biblioteca real migra al esquema 2 sin borrar
  equipos, análisis ni acciones del usuario. Tras abrir 0.8.0 conserva 20
  equipos, 193 jugadores, 10 partidos, tres análisis y un evento.
- EXE y ZIP de Windows 0.8.0 generados y verificados estructuralmente; el
  `app.asar` incluido declara la versión 0.8.0. La prueba física en Windows
  continúa pendiente.

## Referencias

- Historial detallado: `TRASPASO-SCOUTANALYZER-0.7.0.md`.
- Historial de esta versión: `TRASPASO-SCOUTANALYZER-0.8.0.md`.
- Sistema visual: `docs/SISTEMA-VISUAL-0.7.md`.
- Arquitectura de datos: `docs/BASE-DATOS-0.6.md`.
- Catálogo y procedencia: `docs/CATALOGO-FBRM-2026-27.md`.
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

1. Crear el proyecto Supabase del producto y sustituir el perfil local por
   autenticación real sincronizada.
2. Conseguir autorización o un canal oficial para actualizar datos y escudos
   FBRM.
3. Validar las políticas cloud con usuario, club y administrador.
4. Probar físicamente el instalador, vídeo y exportaciones en Windows.
5. Sustituir las plantillas `DEMO` por las plantillas oficiales 2026/27.
6. Conectar los filtros del panel avanzado con todos los análisis históricos,
   no solo con la sesión abierta.
7. Exportar selecciones como un único vídeo de highlights.
