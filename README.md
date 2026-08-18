# Tactovia 0.12.0

**Plataforma privada de análisis deportivo en vídeo.**

Tactovia transforma un partido de baloncesto en acciones etiquetadas,
estadísticas del encuentro, conclusiones automáticas, informes y clips. Funciona
como aplicación de escritorio y su núcleo ya puede utilizarse como webapp
instalable.

## Novedades principales

- Demo siempre accesible sin crear una cuenta.
- Base web instalable (PWA), adaptable y con funcionamiento local.
- El mapa de tiro se oculta por defecto y muestra zonas calientes calculadas con
  las acciones del encuentro.
- Controles iniciales reducidos a −10 s, reproducción/pausa, +10 s y volumen;
  los controles avanzados se activan en Ajustes.
- Resumen en directo ampliado con métricas exclusivamente del etiquetado actual.
- Estadísticas vinculadas únicamente al partido abierto: sin partido etiquetado
  no se muestran datos ficticios.
- Biblioteca personal separada de cada análisis, organizada como carpetas de
  competiciones, equipos y plantillas.
- Centro de informes con conclusiones automáticas de equipo y jugador, dossier
  gráfico, datos estructurados y portal de vídeo.
- Exportación de clips individuales o de un único vídeo de highlights, con
  filtros, orden, agrupación y calidad.
- Playbook retirado de esta versión para centrar el producto en scouting.
- Limpieza de componentes obsoletos y reducción del JavaScript de producción.

## Flujo de trabajo

1. Accede con un perfil local o entra directamente en la demo.
2. Selecciona Baloncesto y crea una sesión o abre un análisis guardado.
3. Elige un vídeo local y configura el partido y sus convocatorias.
4. Etiqueta acciones, jugadores y, cuando proceda, zonas de tiro.
5. Guarda el archivo `.scout.json`: al volver a abrirlo se recuperan acciones,
   partido y estadísticas.
6. Genera conclusiones, gráficos, datos o clips desde **Informe y exportación**.

La guía completa está en [docs/GUIA-USUARIO.md](docs/GUIA-USUARIO.md) y la
referencia de teclado en [docs/ATAJOS.md](docs/ATAJOS.md).

## Aplicación web y escritorio

La webapp permite abrir vídeo local, etiquetar, guardar/abrir análisis JSON y
exportar CSV sin subir información a Internet. Puede instalarse desde un
navegador compatible gracias a su manifiesto PWA.

La aplicación de escritorio añade las funciones que requieren acceso nativo:
SQLite, copia de seguridad de la base, Excel, PDF, Power BI y codificación de
clips o highlights con FFmpeg. Una futura cuenta cloud requerirá backend,
autenticación remota y sincronización; no se simula en esta versión.

## Privacidad y alcance de la IA

- Los vídeos, perfiles y análisis permanecen en el dispositivo.
- La biblioteca pertenece al perfil; el partido etiquetado pertenece al archivo
  de análisis.
- El histórico estadístico no guarda vídeo, rutas ni tiempos de clip.
- Las conclusiones automáticas se calculan localmente a partir de las etiquetas.
  No inventan acciones ni envían datos a un servicio externo.
- La exportación Power BI es un `.xlsx` normalizado, no un archivo `.pbix`.

## Instalación

macOS Apple Silicon: `release/Tactovia-0.12.0-mac-arm64.dmg`

Windows x64: `release/Tactovia-0.12.0-win-x64.exe`

Windows portable: `release/Tactovia-0.12.0-win-x64.zip`

Los instaladores aún no están firmados. macOS puede requerir
**Control + clic → Abrir** y Windows puede mostrar SmartScreen. El empaquetado
elimina entregables anteriores y conserva solo la versión actual.

## Desarrollo

Requisitos: Node.js 24 y pnpm 11.

```text
pnpm install
pnpm dev
pnpm web
pnpm test
pnpm test:database
pnpm test:video
pnpm build
pnpm dist
```

El instalador de Windows generado desde macOS debe probarse físicamente en
Windows. Antes de una distribución comercial también son necesarias la firma,
la notarización y una revisión de licencias.
