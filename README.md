# ScoutAnalyzer 0.6.0

Aplicación de escritorio para analizar vídeo local y etiquetar acciones de
baloncesto. La primera versión funciona sin conexión y mantiene tanto el vídeo
como los análisis en el ordenador.

## Funciones incluidas

- Reproducción de vídeos MP4, MOV, M4V, WebM y OGV.
- Biblioteca histórica local en SQLite para competiciones, temporadas, equipos,
  plantillas, partidos, análisis y acciones.
- Competición piloto preparada para Primera División Masculina GESA FBRM
  2026/27.
- Importación administrativa mediante una plantilla Excel de equipos,
  jugadores y partidos.
- Identidad única de jugador separada de sus plantillas por temporada.
- Copia de seguridad de la biblioteca desde la propia aplicación.
- Estructura PostgreSQL/Supabase con catálogo compartido, roles y análisis
  privados por defecto, preparada para la fase online.
- Etiquetas de instante y de intervalo.
- Base de datos persistente de equipos y jugadores con logo o fotografía.
- Fichas rápidas y detalladas de clubes y jugadores.
- Selección obligatoria de los dos equipos del partido al cargar el vídeo.
- Plantilla completamente configurable: nombre, color, comportamiento, atajo y
  segundos anteriores/posteriores.
- Contexto por acción: equipo, jugador y nota rápida.
- Línea temporal navegable, edición y selección de eventos.
- Estadísticas personalizables y persistentes por etiqueta, equipo y jugador.
- Paneles de vídeo y etiquetado redimensionables mediante arrastre.
- Reproductor verificado con saltos reales, lectura por rangos, tres controles
  visibles por defecto y atajos configurables hasta ×16.
- Tabla de eventos ordenable por cualquiera de sus columnas.
- Exportación de datos a CSV.
- Exportación a XLSX con hojas de resumen, eventos, equipos y jugadores.
- Exportación de uno o varios clips MP4.
- Organización de clips por etiqueta, equipo o jugador.
- Informe PDF con resumen y registro de acciones.
- Playbook 2.0 con biblioteca por carpetas y equipos, plantillas tácticas,
  jugadores ofensivos y defensivos, acciones temporizadas, fases inteligentes,
  animación completa, notas por bloques, recursos adjuntos y presentación
  configurable.
- Media pista profesional en orientación vertical, con parqué de madera,
  canasta superior, marcajes reglamentarios y conversión automática de las
  jugadas dibujadas en la pista anterior.
- Exportación del Playbook como PNG, PDF o vídeo animado WebM.
- Guardado automático local y archivos de proyecto `.scout.json`.
- Limpieza automática de versiones anteriores y archivos intermedios de
  empaquetado.

## Instalar en macOS

El instalador generado para Apple Silicon está en:

`release/ScoutAnalyzer-0.6.0-mac-arm64.dmg`

1. Abre el DMG.
2. Arrastra ScoutAnalyzer a Aplicaciones.
3. Al no estar firmado todavía con una cuenta de desarrollador de Apple, macOS
   puede mostrar un aviso. Pulsa Control y haz clic sobre la aplicación, elige
   **Abrir** y confirma.
4. Comprueba que en la esquina superior izquierda aparece **Versión 0.6.0**.

Al iniciar una actualización instalada en Aplicaciones, las copias anteriores
identificadas como ScoutAnalyzer se mueven a la Papelera. El DMG debe seguir
instalándose con el nombre `ScoutAnalyzer.app`.

## Instalar en Windows

El instalador generado para Windows x64 está en:

`release/ScoutAnalyzer-0.6.0-win-x64.exe`

También existe una versión portable:

`release/ScoutAnalyzer-0.6.0-win-x64.zip`

En la versión portable hay que descomprimir primero todo el archivo y después
abrir `ScoutAnalyzer.exe`. Como el programa todavía no dispone de certificado
de firma, Windows SmartScreen puede mostrar un aviso de editor desconocido.

## Primer análisis

1. Pulsa **Seleccionar vídeo**.
2. Selecciona los dos equipos del partido.
3. Cambia el nombre del análisis en la parte superior.
4. Completa, si quieres, equipo, jugador y nota rápida.
5. Pulsa una etiqueta o utiliza su atajo.
   - Una etiqueta de instante se guarda al pulsarla.
   - Una etiqueta de intervalo se inicia con la primera pulsación y termina con
     la segunda.
6. Revisa o corrige los eventos desde la tabla inferior.
7. Guarda el análisis para crear un archivo `.scout.json`.
8. Usa **Informe y exportación** para generar datos, clips o PDF.

## Biblioteca de scouting

La pestaña **Biblioteca** reúne el histórico deportivo de la aplicación:

1. En **Administración**, guarda la plantilla Excel.
2. Completa equipos, jugadores y partidos conservando sus códigos.
3. Importa el libro y revisa los posibles avisos.
4. En **Partidos**, elige **Usar en etiquetado** para cargar los dos equipos y
   sus plantillas en el análisis.
5. Crea periódicamente una copia de seguridad desde Administración.

Los análisis existentes se incorporan automáticamente a la nueva base local al
abrir esta versión. El archivo de vídeo no se copia ni se sube.

La estructura futura de cuentas y permisos ya está definida, pero la
sincronización entre ordenadores todavía no se activa hasta crear y configurar
el servicio de nube. La guía técnica y de permisos está en
`docs/BASE-DATOS-0.6.md`.

## Playbook 2.0

El Playbook se organiza en cuatro modos:

1. **Dibujar**: coloca jugadores, utiliza plantillas tácticas y traza botes,
   pases, cortes, bloqueos, tiros y manos a mano.
2. **Animar**: configura el orden, inicio y duración de cada acción, reproduce
   una fase o la jugada completa y ajusta su velocidad.
3. **Notas**: añade explicación general, información por fase, bloques de
   texto, listas y recursos locales o enlaces.
4. **Presentación**: configura el documento final y exporta PNG, PDF o vídeo
   animado WebM.

La opción **Siguiente inteligente** crea una fase nueva aplicando los
movimientos y los cambios de posesión definidos en la fase actual. Las jugadas
de versiones anteriores se convierten automáticamente al nuevo formato.

La media pista utiliza ahora una vista vertical profesional: parqué segmentado,
canasta centrada en la línea superior, zona, semicírculo de tiro libre, arco de
triple y semicírculo de medio campo. Las jugadas creadas sobre la pista
horizontal anterior se recolocan automáticamente al abrirlas.

La guía detallada está en `docs/PLAYBOOK-2.md`.

Atajos generales:

- `Espacio`: reproducir o pausar.
- `←` / `→`: retroceder o avanzar diez segundos.
- `Ctrl+S` o `Cmd+S`: guardar el análisis.
- Los atajos de las etiquetas se configuran desde **Configurar**.
- La guía completa está en `docs/ATAJOS.md` y dentro de **Ajustes**.

## Privacidad y archivos

El vídeo no se copia dentro del proyecto y nunca se sube a internet. El archivo
`.scout.json` guarda la ruta del vídeo original, la plantilla y los eventos. Si
el vídeo se mueve, habrá que volver a seleccionarlo.

Existe además una recuperación automática local para proteger el trabajo entre
sesiones. Conviene guardar explícitamente cada análisis que se quiera conservar
o trasladar a otro ordenador.

## Desarrollo

Requisitos:

- Node.js 24
- pnpm 11

Comandos:

```text
pnpm install
pnpm dev
pnpm test
pnpm test:database
pnpm test:video
pnpm build
pnpm dist
pnpm clean:release
```

Los ejecutables de FFmpeg para macOS Apple Silicon y Windows x64 se mantienen
separados en `vendor/ffmpeg` y se incorpora únicamente el correspondiente a cada
paquete.

Cada empaquetado elimina automáticamente instaladores de versiones anteriores,
carpetas desempaquetadas, archivos `blockmap` e informes temporales. La carpeta
`release` conserva únicamente el DMG actual, el instalador de Windows y el ZIP
portable de Windows.

## Alcance de esta versión

Esta versión incorpora la base histórica local y prepara el modelo compartido.
No incluye todavía cuentas activas, sincronización entre ordenadores, vídeo en
directo, plantillas compartidas ni reconocimiento automático mediante IA. El
instalador de Windows ha sido
empaquetado y verificado estructuralmente desde macOS; su prueba de ejecución
debe hacerse en un ordenador Windows x64.

Antes de distribuir la aplicación comercialmente deben añadirse firma y
notarización de los instaladores, una identidad visual definitiva y una revisión
de las licencias del binario de FFmpeg incluido.
