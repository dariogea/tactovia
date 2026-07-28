# Tactovia 0.11.0

**Plataforma local de análisis deportivo.**

Tactovia convierte un vídeo de baloncesto en acciones etiquetadas, estadísticas,
informes, clips y conocimiento reutilizable sobre equipos y jugadores.

## Novedades principales

- Acceso mediante varios perfiles locales, registro e inicio de sesión.
- Entrada demo disponible únicamente durante el desarrollo y sin persistencia.
- Datos, autoguardado e histórico separados por perfil.
- Histórico estadístico de partidos guardados sin vídeo, ruta ni tiempos de clip.
- Biblioteca creada por el usuario: competición → equipo → plantilla.
- Cuatro plantillas iniciales de 5, 8, 10 o 12 jugadores.
- Identidad única de jugador, traspasos entre equipos y agentes libres.
- Convocatoria obligatoria de entre 5 y 12 jugadores por equipo.
- Selección de jugador mediante camiseta y dorsal.
- Etiquetas predeterminadas de canasta y fallo de 2P/3P con colores semánticos.
- Mapa SVG original de diez zonas con volumen, acierto y porcentaje.
- Panel estadístico interactivo con filtros y visuales personalizables.
- Informes PDF configurables con zonas, jugadores y cronología.
- CSV, Excel y libro normalizado preparado para importar en Power BI.
- Presets para exportar clips por jugador, equipo o cronología.
- Playbook organizado en Diseñar, Secuencia, Explicar y Compartir.
- Cuatro paletas visuales, modo claro, oscuro y automático.
- Guía completa integrada en Perfil y ajustes.

## Flujo de trabajo

1. Crea o abre un perfil local.
2. Selecciona Baloncesto y crea una sesión.
3. Elige un vídeo local.
4. Selecciona los equipos y una convocatoria de 5 a 12 jugadores por equipo.
5. Selecciona equipo, dorsal y zona de pista antes de registrar la acción.
6. Etiqueta el partido y revisa la cronología.
7. Guarda el archivo `.scout.json`. Si el análisis contiene un partido y
   acciones, Tactovia crea además un histórico estadístico privado del perfil.
8. Consulta Estadísticas o genera datos, PDF y clips desde Informe y
   exportación.

La guía paso a paso está en [docs/GUIA-USUARIO.md](docs/GUIA-USUARIO.md) y la
referencia de teclado en [docs/ATAJOS.md](docs/ATAJOS.md).

## Privacidad y alcance

- Todo funciona de forma local y sin conexión.
- El vídeo nunca se guarda dentro del histórico estadístico.
- Los clips solo se pueden generar desde el proyecto editable que conserva la
  referencia al vídeo original.
- El acceso actual es local: no es todavía una cuenta sincronizada en la nube.
- La exportación para Power BI es un libro `.xlsx` normalizado. Tactovia no
  genera el formato propietario `.pbix`.
- No hay catálogo oficial precargado, importador masivo, calendarios ni partidos
  predichos. La biblioteca contiene exclusivamente datos creados por el usuario.

## Instalación

macOS Apple Silicon:

`release/Tactovia-0.11.0-mac-arm64.dmg`

Windows x64:

`release/Tactovia-0.11.0-win-x64.exe`

Windows portable:

`release/Tactovia-0.11.0-win-x64.zip`

Los instaladores no están firmados todavía. macOS puede requerir
**Control + clic → Abrir** y Windows puede mostrar SmartScreen. Cada empaquetado
elimina los entregables de versiones anteriores y conserva únicamente los tres
archivos de la versión actual.

## Desarrollo

Requisitos: Node.js 24 y pnpm 11.

```text
pnpm install
pnpm dev
pnpm test
pnpm test:database
pnpm test:video
pnpm build
pnpm dist
```

El instalador de Windows se puede empaquetar desde macOS, pero debe probarse
físicamente en Windows antes de distribuirlo. Para comercializar la aplicación
también faltan la firma y notarización, la infraestructura de cuentas y una
revisión de licencias de los binarios incluidos.
