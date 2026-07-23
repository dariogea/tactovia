# Contexto permanente de ScoutAnalyzer

Última actualización: 23 de julio de 2026  
Versión estable: 0.4.0

## Objetivo

Aplicación de escritorio para analizar vídeos locales de baloncesto, etiquetar
acciones, gestionar equipos y jugadores, generar estadísticas, exportar clips e
informes y diseñar jugadas en un Playbook.

## Estado actual

- Aplicación local para macOS Apple Silicon y Windows x64.
- Electron, React y Vite.
- Equipos y jugadores con fichas rápidas y detalladas, logos y fotografías.
- Partido obligatorio al cargar un vídeo.
- Etiquetas personalizables de instante e intervalo.
- Nota rápida como único descriptor manual de la acción.
- Navegación de vídeo mediante peticiones por rangos.
- Tres controles visibles por defecto: −10 s, reproducir/pausar y +10 s.
- Línea temporal navegable y tabla ordenable.
- Estadísticas de partido, equipo y jugador con gráficos personalizables.
- Exportación CSV/XLSX, clips seleccionados y PDF.
- Playbook con carpetas, fases, jugadores, texto y exportación PNG/PDF.

## Verificación estable

- 13 pruebas automáticas superadas.
- Prueba multimedia real superada:
  `VIDEO_SEEK_OK duration=12.00 seek=7.25 playback=8.46 rate=2x ranges=1`.
- DMG 0.4.0 validado y aplicación macOS instalada.
- Paquetes de Windows construidos, pero pendientes de prueba física en Windows.

## Referencias

- Historial detallado: `TRASPASO-SCOUTANALYZER-0.4.0.md`.
- Feedback comprobado: `docs/FEEDBACK-0.4.md`.
- Atajos: `docs/ATAJOS.md`.
- Hoja de ruta: `docs/ROADMAP.md`.

## Protocolo al cambiar de ordenador

1. Antes de trabajar, descargar los últimos cambios del repositorio.
2. Pedir a Codex que lea `AGENTS.md` y este archivo.
3. Trabajar y ejecutar las verificaciones.
4. Actualizar este contexto si cambia el estado estable.
5. Guardar y subir los cambios antes de cambiar de ordenador.

## Próximas prioridades

1. Probar físicamente el instalador, vídeo y exportaciones en Windows.
2. Añadir icono propio e identidad visual.
3. Importar y exportar plantillas de etiquetas.
4. Crear filtros combinados y listas de reproducción.
5. Exportar selecciones como un único vídeo de highlights.
6. Comparar varios partidos.

