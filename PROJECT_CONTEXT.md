# Contexto permanente de Tactovia

Última actualización: 28 de julio de 2026
Versión estable: 0.10.0

## Objetivo

Aplicación de escritorio para analizar vídeos locales de baloncesto, etiquetar
acciones, gestionar equipos y jugadores, generar estadísticas, exportar clips e
informes y diseñar jugadas en un Playbook.

## Estado actual

- Aplicación local para macOS Apple Silicon y Windows x64.
- Electron, React y Vite.
- Acceso con perfil y contraseña locales o entrada directa sin registro en modo
  demo. No se presenta como autenticación cloud.
- Al iniciar se selecciona Baloncesto y se elige entre nueva sesión, continuar
  el autoguardado o abrir un archivo.
- Identidad completa Tactovia: descriptor **Plataforma de análisis deportivo**,
  claim **Ve el juego. Decide mejor.** y claim funcional **Del vídeo a la
  decisión.**
- Sistema visual con Game Ink, Strategic Teal, Signal Lime, Analysis White y
  Slate, aplicado de forma centralizada y sin alterar la densidad operativa.
- Temas automático, claro y oscuro. Las antiguas preferencias de paleta se
  migran a Tactovia y permanecen guardadas localmente.
- Logos oficiales adaptativos, favicon, introducción animada respetuosa con
  movimiento reducido, iconos de escritorio y sección “Acerca de Tactovia”.
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
- Importador Excel/CSV guiado para competición, equipos, jugadores y cambios de
  plantilla, con códigos estables y copia de seguridad local.
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
  distinguen canasta y tiro fallado de 2P y 3P con colores semánticos; las
  etiquetas antiguas migran según la zona registrada.
- Mapa compacto de diez zonas, activable y configurable con o sin nombres. Cada
  tiro exige una zona compatible con 2P/3P; el doble clic deshace la selección.
- Nota rápida como único descriptor manual de la acción.
- Navegación de vídeo mediante peticiones por rangos.
- Tres controles visibles por defecto: −10 s, reproducir/pausar y +10 s.
- Botón de silencio, barra de volumen, porcentaje y resumen en directo de
  acciones, ritmo, etiqueta principal e identificación de jugadores.
- Línea temporal navegable y tabla ordenable.
- Tabla de eventos con ventanas informativas de etiqueta, equipo y jugador.
- Estadísticas tipo Power BI con filtros globales, KPIs, evolución, comparación,
  ranking, mapa de tiro y control de calidad/completitud del etiquetado.
- Centro de informes reorganizado en informe técnico, datos y vídeo; exporta
  CSV/XLSX, clips seleccionados, PDF y resumen ejecutivo copiable.
- Biblioteca desplegable Competición → Equipo → Plantilla, directorio de
  jugadores con ficha completa y histórico limitado a partidos ya analizados.
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
- macOS mueve a la Papelera otras copias del mismo producto con una versión
  igual o anterior cuando se abre Tactovia desde Aplicaciones, aunque la copia
  anterior todavía se llame ScoutAnalyzer.
- Windows actualiza siempre el mismo destino e identificador de instalación.
- El proceso de empaquetado ya no depende de rutas personales del ordenador.
- El nombre público y los paquetes son Tactovia, pero el `appId`, la carpeta
  `scout-analyzer`, la base `scoutanalyzer.db`, las claves locales y la extensión
  `.scout.json` se conservan para no romper los datos existentes.

## Verificación estable

- 45 pruebas automáticas superadas.
- Prueba de base de datos dentro de Electron superada:
  `DATABASE_OK version=2 teams=2 players=1 matches=1 events=1 privacy=private`.
- Renderizado aislado de diez paneles y flujos principales superado.
- Prueba multimedia real superada:
  `VIDEO_SEEK_OK duration=12.00 seek=7.25 playback=8.45 rate=2x ranges=1`.
- Compilación de producción 0.10.0 superada.
- Acceso, cabecera, introducción, Perfil/Ajustes y “Acerca de” revisados en
  claro y oscuro a 1280 y 1024 px, sin desbordamiento horizontal ni deformación
  de logotipos.
- Favicon de 16 y 32 px e iconos ICNS, ICO y PNG comprobados.
- La base real se abrió sobre una copia consistente y fue reconocida sin perder
  contenido: esquema 2, 20 equipos, 193 jugadores, 13 partidos, seis análisis y
  48 eventos.
- DMG 0.10.0 generado, validado con `hdiutil verify` e inspeccionado con nombre
  Tactovia, versión 0.10.0, icono oficial y bundle ID compatible.
- EXE y ZIP de Windows 0.10.0 generados. El ZIP contiene `Tactovia.exe`,
  `app.asar`, FFmpeg y los recursos de marca; la prueba física en Windows
  continúa pendiente.
- `release` contiene únicamente los tres entregables de la versión actual.

## Referencias

- Historial detallado: `TRASPASO-SCOUTANALYZER-0.7.0.md`.
- Historial anterior: `TRASPASO-SCOUTANALYZER-0.9.0.md`.
- Historial de esta versión: `TRASPASO-TACTOVIA-0.10.0.md`.
- Implementación y compatibilidad de marca: `BRAND_IMPLEMENTATION.md`.
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
