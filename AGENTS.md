# Instrucciones permanentes de ScoutAnalyzer

## Comunicación

- Habla con el usuario en español y con lenguaje no técnico.
- El usuario no tiene experiencia programando; ejecuta el trabajo completo
  siempre que sea seguro y esté dentro de la petición.
- No des por correcto un cambio solo porque compile. Contrasta cada entrega con
  el feedback y explica cualquier limitación real.

## Antes de modificar

1. Lee `PROJECT_CONTEXT.md`.
2. Lee `TRASPASO-SCOUTANALYZER-0.5.1.md` cuando necesites el historial completo.
3. Revisa el estado actual y conserva las funciones existentes.
4. No edites ni elimines vídeos, análisis personales o instaladores sin una
   petición explícita.

## Desarrollo y verificación

- La aplicación debe seguir funcionando en macOS y Windows.
- Mantén el vídeo y los datos del usuario en local.
- Antes de entregar una versión:
  - ejecuta las pruebas automáticas;
  - ejecuta la prueba real de navegación de vídeo;
  - compila la aplicación;
  - comprueba el número de versión dentro del paquete;
  - actualiza `PROJECT_CONTEXT.md`.
- La prueba multimedia principal está en `scripts/verify-video-seek.cjs`.
- No confirmes que Windows funciona físicamente hasta probarlo en Windows.

## Privacidad y repositorio

- No añadas al repositorio vídeos, archivos `.scout.json`, credenciales,
  dependencias instaladas ni datos personales.
- No añadas `node_modules`, `dist` o `release`.
- Mantén los instaladores y vídeos en almacenamiento privado externo.
- Antes de cambiar de ordenador, deja el repositorio comprobado y sincronizado.
