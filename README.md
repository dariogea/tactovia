# ScoutAnalyzer 0.4

Aplicación de escritorio para analizar vídeo local y etiquetar acciones de
baloncesto. La primera versión funciona sin conexión y mantiene tanto el vídeo
como los análisis en el ordenador.

## Funciones incluidas

- Reproducción de vídeos MP4, MOV, M4V, WebM y OGV.
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
- Playbook por carpetas y equipos, con guardado explícito, fases, estilos de
  pista, texto y exportación PNG/PDF.
- Guardado automático local y archivos de proyecto `.scout.json`.

## Instalar en macOS

El instalador generado para Apple Silicon está en:

`release/ScoutAnalyzer-0.4.0-mac-arm64.dmg`

1. Abre el DMG.
2. Arrastra ScoutAnalyzer a Aplicaciones.
3. Al no estar firmado todavía con una cuenta de desarrollador de Apple, macOS
   puede mostrar un aviso. Pulsa Control y haz clic sobre la aplicación, elige
   **Abrir** y confirma.
4. Comprueba que en la esquina superior izquierda aparece **Versión 0.4.0**.

## Instalar en Windows

El instalador generado para Windows x64 está en:

`release/ScoutAnalyzer-0.4.0-win-x64.exe`

También existe una versión portable:

`release/ScoutAnalyzer-0.4.0-win-x64.zip`

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
pnpm test:video
pnpm build
pnpm dist
```

Los ejecutables de FFmpeg para macOS Apple Silicon y Windows x64 se mantienen
separados en `vendor/ffmpeg` y se incorpora únicamente el correspondiente a cada
paquete.

## Alcance de esta versión

Esta es una versión local. No incluye todavía cuentas, colaboración en
la nube, vídeo en directo, plantillas compartidas ni reconocimiento automático
mediante IA. El instalador de Windows ha sido
empaquetado y verificado estructuralmente desde macOS; su prueba de ejecución
debe hacerse en un ordenador Windows x64.

Antes de distribuir la aplicación comercialmente deben añadirse firma y
notarización de los instaladores, una identidad visual definitiva y una revisión
de las licencias del binario de FFmpeg incluido.
