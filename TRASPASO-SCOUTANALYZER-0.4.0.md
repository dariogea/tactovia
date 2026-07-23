# Documento de traspaso — ScoutAnalyzer

Fecha de preparación: 23 de julio de 2026  
Versión actual: 0.4.0  
Estado: aplicación funcional instalada y verificada en macOS Apple Silicon

## 1. Objetivo del proyecto

ScoutAnalyzer es una aplicación de escritorio para analizar vídeos locales de
baloncesto y etiquetar acciones concretas del juego, siguiendo una idea similar
a Nacsport.

El usuario no tiene experiencia programando y quiere que Codex se encargue del
desarrollo completo. De momento será una herramienta personal, sin presupuesto,
para Windows y macOS. El vídeo permanece siempre en local.

Funciones principales buscadas:

- Reproducción y navegación precisa de vídeo.
- Etiquetas completamente configurables.
- Etiquetas de instante y de intervalo.
- Márgenes configurables antes y después de una acción.
- Base de datos de equipos y jugadores.
- Clips, estadísticas, informes y exportación de datos.
- Playbook para dibujar jugadas.
- En el futuro: análisis en directo, colaboración e inteligencia artificial.

## 2. Ubicación actual del proyecto

En el Mac original:

```text
/Users/dariogealopez/.codex/.chatgpt-projects/g-p-6a61fbce6bec81919130ffb4d25ab254
```

La aplicación instalada está en:

```text
/Applications/ScoutAnalyzer.app
```

La copia instalada fue actualizada desde la versión 0.2.0 a la 0.4.0.

## 3. Tecnología

- Electron 43.
- React 19.
- Vite 8.
- ExcelJS para exportar XLSX.
- FFmpeg local para generar clips.
- Persistencia local y proyectos `.scout.json`.
- Sin servidor, cuenta ni almacenamiento en la nube.

Archivos principales:

```text
src/App.jsx
src/styles.css
src/components/
src/lib/
electron/main.cjs
electron/media.cjs
electron/preload.cjs
docs/ATAJOS.md
docs/FEEDBACK-0.4.md
```

## 4. Feedback solicitado e implementación actual

### Etiquetado y reproducción

- La reproducción utiliza un protocolo local con soporte de peticiones por
  rangos (`Accept-Ranges` y respuestas `206`).
- La barra situada debajo del vídeo permite pulsar y arrastrar.
- La línea temporal inferior también permite pulsar y arrastrar.
- Por defecto solo aparecen tres botones:
  - Retroceder 10 segundos.
  - Reproducir o pausar.
  - Avanzar 10 segundos.
- Desde Ajustes se pueden activar otros botones existentes.
- Se eliminaron Resultado y Descriptor.
- Solo permanece Nota rápida.
- Los jugadores se ordenan por dorsal numérico.
- Al cargar un vídeo es obligatorio elegir dos equipos distintos.
- El diálogo del partido permite crear equipos rápidamente o abrir la gestión
  completa de equipos y jugadores.
- El vídeo y el panel de etiquetas se pueden redimensionar arrastrando.
- La altura de las etiquetas también se puede ajustar.

### Controles y atajos

- Saltos cortos, medios y largos configurables.
- Fotograma anterior y siguiente.
- Velocidades 0,25×, 0,5×, 0,75×, 1×, 1,5×, 2×, 4×, 8× y 16×.
- Aumentar o reducir velocidad.
- Silenciar y modificar volumen.
- Evento anterior y siguiente.
- Inicio y final del vídeo.
- Atajos editables mediante botones sencillos.
- Detección visual de atajos repetidos.
- Guía completa en `docs/ATAJOS.md` y dentro de Ajustes.

### Equipos y jugadores

- Biblioteca persistente de equipos.
- Creación y eliminación de equipos y jugadores.
- Logo del club y fotografía del jugador.
- Colores principal y secundario.
- Vista rápida y vista detallada independientes para equipos.
- Vista rápida y vista detallada independientes para jugadores.
- Datos detallados de club, temporada, categoría, cuerpo técnico y ubicación.
- Datos detallados del jugador: dorsal, posiciones, medidas, nacimiento,
  nacionalidad, mano dominante, rol, estado, contacto y notas.

### Estadísticas

- Estadísticas del partido completo, de un equipo o de un jugador.
- Gráficos de barras, anillo y evolución temporal.
- Métrica por número de acciones o duración acumulada.
- Colores por equipo, por etiqueta o color personalizado.
- Las preferencias del gráfico se conservan al cambiar de pestaña.
- Comparación visual de equipos.
- Clasificación de jugadores etiquetados.
- Logos, fotografías y colores de los clubes aplicados a las visualizaciones.

### Línea temporal y tabla

- Línea temporal navegable.
- Eventos visibles sobre la línea.
- Selección individual o de todos los eventos.
- Edición y eliminación de eventos.
- Columnas ordenables al pulsar sus títulos:
  - Tiempo.
  - Etiqueta.
  - Equipo.
  - Jugador.
  - Notas.
- Los equipos aparecen tematizados con sus colores.

### Exportación de clips

- Exportación de todos los clips.
- Exportación únicamente de eventos seleccionados.
- Orden cronológico o por etiqueta, equipo o jugador.
- Organización sin carpetas o mediante carpetas por:
  - Etiqueta.
  - Equipo.
  - Jugador.
  - Etiqueta y equipo.
  - Equipo y jugador.

### Datos e informes

- Una única opción de exportación de datos.
- Selector de formato CSV o XLSX.
- El XLSX contiene hojas de resumen, eventos, equipos y jugadores.
- Informe PDF con resumen y registro cronológico.
- El CSV no contiene Resultado ni Descriptor.

### Playbook

- Biblioteca de jugadas con buscador.
- Carpetas personales.
- Carpetas vinculadas a equipos.
- Creación, renombrado y eliminación de carpetas.
- Guardado explícito de la jugada en la biblioteca.
- Duplicado y eliminación de jugadas.
- Media pista o pista completa.
- Colores configurables para parqué, exterior, líneas, zona y acentos.
- Grosor de líneas configurable mediante tamaños.
- Herramientas de selección, jugador, balón, flecha, línea, texto y borrador.
- Jugadores neutros del 1 al 5.
- Jugadores reales procedentes de los equipos.
- Los elementos ya dibujados se pueden seleccionar y mover.
- Varias fases por jugada.
- Una fase nueva copia los objetos de la anterior para recolocarlos.
- Descripción y notas del entrenador.
- Exportación PNG de la fase actual.
- Exportación PDF de todas las fases.

### Ajustes y diseño general

- Tamaños de interfaz mediante opciones Compacto, Equilibrado y Amplio.
- Tamaños de etiquetas Pequeñas, Medianas y Grandes.
- No se muestran medidas en píxeles al usuario.
- Catálogo completo de botones visibles.
- Diseño reducido y organizado por pestañas.
- Tematización por colores del equipo en etiquetado, estadísticas, plantillas,
  línea temporal y Playbook.
- La versión aparece en la esquina superior izquierda de la aplicación.

## 5. Corrección y validación del vídeo

Se añadió una prueba de integración real:

```text
scripts/verify-video-seek.cjs
```

La prueba:

1. Genera un MP4 local de 12 segundos.
2. Lo reproduce mediante el mismo protocolo usado por ScoutAnalyzer.
3. Salta directamente al segundo 7,25.
4. Cambia la velocidad a 2×.
5. Comprueba que el vídeo continúa avanzando.

Resultado obtenido:

```text
VIDEO_SEEK_OK duration=12.00 seek=7.25 playback=8.46 rate=2x ranges=1
```

También se superaron:

- 13 pruebas automáticas.
- Renderizado de los cinco componentes principales.
- Compilación de producción con Vite.
- Arranque de la aplicación macOS ya empaquetada.
- Verificación interna de que Mac y Windows contienen el mismo bundle.
- Validación completa del DMG mediante `hdiutil verify`.

## 6. Instaladores generados

Dentro de la carpeta `release`:

```text
ScoutAnalyzer-0.4.0-mac-arm64.dmg
ScoutAnalyzer-0.4.0-mac-arm64.zip
ScoutAnalyzer-0.4.0-win-x64.exe
ScoutAnalyzer-0.4.0-win-x64.zip
```

Huellas SHA-256:

```text
ad05974cfb9631b5d6a54d0fde73dd9d6d049fd9aa81aff6901ae6752cf13ae5  ScoutAnalyzer-0.4.0-mac-arm64.dmg
3d7feddd7fb1211f42ccc3d46551f54a5282b24fc3421b6e76cbf4177b30b3c7  ScoutAnalyzer-0.4.0-win-x64.exe
f20594d0709f3faf252899606114a93ab3ed0791ab5e4d744d3f39698a115bb3  ScoutAnalyzer-0.4.0-win-x64.zip
```

El instalador de Windows fue empaquetado y comprobado internamente desde macOS,
pero todavía debe probarse físicamente en un ordenador Windows x64.

## 7. Limitaciones actuales

- La aplicación no está firmada ni notarizada.
- macOS y Windows pueden mostrar un aviso de desarrollador desconocido.
- Solo existe compilación de macOS para Apple Silicon.
- Windows requiere procesador x64.
- El vídeo no se incluye dentro del archivo `.scout.json`; se conserva su ruta.
- No hay sincronización entre ordenadores.
- No hay cuentas, colaboración ni almacenamiento en la nube.
- No hay análisis automático mediante inteligencia artificial.
- No hay prueba física completada en Windows.
- Se utiliza todavía el icono predeterminado de Electron.

## 8. Cómo continuar desde otro ordenador

Para revisar solamente el contexto:

1. Copiar este archivo al otro ordenador.
2. Abrir un chat nuevo.
3. Adjuntar este archivo.
4. Pegar el mensaje incluido en el apartado siguiente.

Para continuar programando:

1. Copiar además la carpeta completa del proyecto.
2. No es necesario copiar `node_modules`; puede reinstalarse.
3. Conservar `vendor/ffmpeg`, `package.json`, `pnpm-lock.yaml`, `src`,
   `electron`, `scripts`, `test`, `docs` y `release`.
4. Abrir esa carpeta como proyecto local en Codex.
5. Adjuntar este documento al primer mensaje.

Los análisis personales creados con ScoutAnalyzer se guardan en archivos
`.scout.json`. Esos archivos y los vídeos originales deben copiarse por
separado si también se quieren utilizar en el otro ordenador.

## 9. Mensaje listo para pegar en el nuevo chat

```text
Quiero continuar el desarrollo de ScoutAnalyzer desde otro ordenador.

Lee completamente el documento de traspaso que he adjuntado antes de modificar
nada. La versión actual es la 0.4.0. Conserva las funciones existentes y no
elimines datos, instaladores ni cambios ya implementados.

Primero revisa la carpeta del proyecto y confirma:
1. qué versión contiene;
2. si las dependencias están disponibles;
3. si el sistema es Windows o macOS;
4. qué comprobaciones se pueden ejecutar en este ordenador.

Después continúa desde el estado descrito en el documento. Antes de preparar
una nueva versión, contrasta cada cambio con la lista completa de feedback,
ejecuta las pruebas y muestra claramente el nuevo número de versión dentro de
la aplicación.
```

## 10. Prioridades recomendadas para la siguiente versión

1. Probar físicamente el instalador y la reproducción en Windows.
2. Añadir un icono propio y una identidad visual definitiva.
3. Importar y exportar plantillas de etiquetas.
4. Crear filtros combinados y listas de reproducción de eventos.
5. Exportar una selección como un único vídeo de highlights.
6. Comparar estadísticas entre varios partidos.
7. Preparar firma y notarización antes de una distribución pública.

