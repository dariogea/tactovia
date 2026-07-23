# Documento de traspaso — ScoutAnalyzer

Fecha de preparación: 23 de julio de 2026  
Versión actual: 0.5.0
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

La copia instalada fue actualizada desde la versión 0.2.0 a la 0.5.0.

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

### Playbook 2.0

- Editor propio inspirado funcionalmente en los flujos profesionales de un
  creador de jugadas, sin copiar código ni recursos de terceros.
- Cuatro espacios de trabajo: Dibujar, Animar, Notas y Presentación.
- Biblioteca con buscador, carpetas personales o vinculadas a equipos,
  duplicado, movimiento, guardado y eliminación de jugadas.
- Media pista, pista completa horizontal y pista completa vertical.
- Plantillas: pista vacía, 5 abiertos, Princeton, caja, 1-4 bajo, cuernos,
  1-4 alto, Flex y defensas zonales.
- Colores configurables para parqué, exterior, líneas, zona y acentos.
- Jugadores de ataque, defensa y con balón; jugadores neutros del 1 al 5 y
  jugadores reales procedentes de la base de datos.
- Herramientas de balón, cono, aro, texto, líneas, flechas, formas e imagen.
- Acciones específicas de bote, pase, corte, bloqueo, tiro y mano a mano.
- Inspector para modificar objetos, colores y tiempos de las acciones.
- Fases inteligentes que aplican los desplazamientos y cambios de posesión.
- Opciones para duplicar, vaciar, reflejar, reordenar y eliminar fases.
- Línea temporal con orden, inicio y duración de cada acción.
- Reproducción de una fase o de la jugada completa a distintas velocidades.
- Descripción general, notas por fase, títulos, texto, listas de comprobación,
  archivos locales y enlaces de referencia.
- Presentación clásica o avanzada, con bloques ordenables y estilo
  configurable.
- Exportación PNG de una fase, PDF de la jugada y vídeo animado WebM.
- Conversión automática y sin pérdida de las jugadas creadas en versiones
  anteriores.

### Ajustes y diseño general

- Tamaños de interfaz mediante opciones Compacto, Equilibrado y Amplio.
- Tamaños de etiquetas Pequeñas, Medianas y Grandes.
- No se muestran medidas en píxeles al usuario.
- Catálogo completo de botones visibles.
- Diseño reducido y organizado por pestañas.
- Tematización por colores del equipo en etiquetado, estadísticas, plantillas,
  línea temporal y Playbook.
- La versión aparece en la esquina superior izquierda de la aplicación.

### Actualizaciones y limpieza

- Cada compilación empieza eliminando los instaladores y carpetas intermedias
  de versiones anteriores.
- Al terminar se conservan únicamente tres archivos distribuibles: DMG para
  macOS, instalador EXE para Windows y ZIP portátil para Windows.
- Ya no se genera un ZIP redundante para macOS.
- En macOS, al abrir una versión instalada en `Aplicaciones`, ScoutAnalyzer
  busca otras copias instaladas del mismo producto con una versión igual o
  anterior y las mueve a la Papelera.
- La comprobación utiliza el identificador interno de la aplicación para no
  tocar otras aplicaciones con nombres parecidos.
- En Windows, el instalador mantiene un único destino fijo y reutiliza el mismo
  identificador de aplicación para actualizar la instalación existente.

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

- 23 pruebas automáticas.
- Pruebas específicas de migración, plantillas, fase inteligente, transferencia
  de balón, reflejo y duración de acciones.
- Renderizado de los cinco componentes principales.
- Compilación de producción con Vite.
- Revisión visual del Playbook 2.0 en sus cuatro modos, sin errores de consola.
- Arranque de la aplicación macOS ya empaquetada.
- Verificación interna de que Mac y Windows contienen el mismo bundle.
- Validación completa del DMG mediante `hdiutil verify`.

## 6. Instaladores generados

Dentro de la carpeta `release`:

```text
ScoutAnalyzer-0.5.0-mac-arm64.dmg
ScoutAnalyzer-0.5.0-win-x64.exe
ScoutAnalyzer-0.5.0-win-x64.zip
```

Huellas SHA-256:

```text
3e4622e974c71361ec9111ca87c345b1b73832f0a8467d0f67f2dce1f9408e74  ScoutAnalyzer-0.5.0-mac-arm64.dmg
8fa6c5816e434af6fcbf583b64a8069616a84bba2affd65a55c9ab2c92a1c522  ScoutAnalyzer-0.5.0-win-x64.exe
bccbcd5902a35e775407a259e0aeb743c331b7ccedccd2cebdc6c96ee285be77  ScoutAnalyzer-0.5.0-win-x64.zip
```

El instalador de Windows fue empaquetado y comprobado internamente desde macOS,
pero todavía debe probarse físicamente en un ordenador Windows x64.

## 7. Limitaciones actuales

- La aplicación no está firmada ni notarizada.
- macOS y Windows pueden mostrar un aviso de desarrollador desconocido.
- Solo existe compilación de macOS para Apple Silicon.
- Windows requiere procesador x64.
- El vídeo no se incluye dentro del archivo `.scout.json`; se conserva su ruta.
- El código fuente se sincroniza mediante el repositorio privado de GitHub.
- Los vídeos, análisis personales y datos locales de la aplicación no se
  sincronizan automáticamente entre ordenadores.
- No hay cuentas, colaboración ni almacenamiento en la nube.
- No hay análisis automático mediante inteligencia artificial.
- No hay prueba física completada en Windows.
- Se utiliza todavía el icono predeterminado de Electron.

## 8. Cómo continuar desde otro ordenador

Para continuar programando:

1. Abrir GitHub Desktop en el ordenador que se vaya a utilizar.
2. Seleccionar el repositorio privado `ScoutAnalyzer`.
3. Pulsar **Fetch origin** y después **Pull origin** si hay cambios.
4. Abrir esa carpeta como proyecto local en Codex.
5. Pedir a Codex que lea `AGENTS.md` y `PROJECT_CONTEXT.md`.
6. Al terminar, guardar y subir los cambios antes de cambiar de ordenador.

No es necesario sincronizar `node_modules`, `dist` ni `release`; se regeneran
en el ordenador de trabajo y están excluidos del repositorio.

Los análisis personales creados con ScoutAnalyzer se guardan en archivos
`.scout.json`. Esos archivos y los vídeos originales deben copiarse por
separado si también se quieren utilizar en el otro ordenador.

## 9. Mensaje listo para pegar en el nuevo chat

```text
Quiero continuar el desarrollo de ScoutAnalyzer desde otro ordenador.

Lee completamente el documento de traspaso que he adjuntado antes de modificar
nada. La versión actual es la 0.5.0. Conserva las funciones existentes y no
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
2. Probar la exportación WebM en un segundo Mac y en Windows.
3. Añadir un icono propio y una identidad visual definitiva.
4. Importar y exportar plantillas de etiquetas.
5. Crear filtros combinados y listas de reproducción de eventos.
6. Exportar una selección como un único vídeo de highlights.
7. Comparar estadísticas entre varios partidos.
8. Preparar firma y notarización antes de una distribución pública.
