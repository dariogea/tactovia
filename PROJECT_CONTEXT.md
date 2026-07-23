# Contexto permanente de ScoutAnalyzer

Última actualización: 23 de julio de 2026  
Versión estable: 0.4.1

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

- 19 pruebas automáticas superadas.
- Prueba multimedia real superada:
  `VIDEO_SEEK_OK duration=12.00 seek=7.25 playback=8.46 rate=2x ranges=1`.
- DMG 0.4.1 validado, abierto y aplicación macOS instalada.
- Paquetes de Windows construidos, pero pendientes de prueba física en Windows.
- La carpeta `release` se redujo de 2,6 GB acumulados a unos 444 MB con tres
  archivos distribuibles.

## Referencias

- Historial detallado: `TRASPASO-SCOUTANALYZER-0.4.1.md`.
- Feedback comprobado: `docs/FEEDBACK-0.4.md`.
- Atajos: `docs/ATAJOS.md`.
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

1. Probar físicamente el instalador, vídeo y exportaciones en Windows.
2. Añadir icono propio e identidad visual.
3. Importar y exportar plantillas de etiquetas.
4. Crear filtros combinados y listas de reproducción.
5. Exportar selecciones como un único vídeo de highlights.
6. Comparar varios partidos.
