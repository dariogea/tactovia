# Contexto permanente de Tactovia

Última actualización: 28 de julio de 2026
Versión estable: 0.11.0

## Producto

Aplicación Electron/React/Vite para macOS Apple Silicon y Windows x64. Analiza
vídeo local de baloncesto, etiqueta acciones, gestiona equipos y jugadores,
genera estadísticas, informes y clips y permite diseñar jugadas.

## Estado funcional

- Varios perfiles locales con contraseña.
- Datos, preferencias, autoguardado e histórico separados por perfil.
- Demo efímera solo en desarrollo y sin persistencia.
- Baloncesto como deporte activo; otros deportes quedan para fases posteriores.
- Sesión nueva, continuación del autoguardado o apertura de `.scout.json`.
- Partido obligatorio y convocatoria de 5 a 12 jugadores por equipo.
- Biblioteca creada por el usuario: competición → equipo → plantilla.
- Cuatro plantillas rápidas de 5, 8, 10 y 12 jugadores.
- Identidad global de jugador, traspasos y agentes libres.
- Camisetas con colores principal/secundario para seleccionar dorsales.
- Etiquetas editables de instante o intervalo.
- Etiquetas iniciales: acierto 2P, acierto 3P, fallo 2P y fallo 3P, seguidas de
  rebotes, pérdida, recuperación y acciones tácticas.
- Pista SVG original con diez zonas, doble clic para deshacer y posición
  configurable encima o debajo de las etiquetas.
- Reproductor con controles, barra de volumen, velocidades hasta ×16, saltos,
  fotogramas, navegación por eventos y atajos editables.
- Resumen en directo configurable.
- Línea temporal navegable y tabla ordenable con fichas emergentes.
- Estadísticas tipo informe BI con filtros, KPIs, tendencia, ranking, equipos,
  jugadores, zonas y control de calidad.
- Informes PDF configurables, CSV, Excel y Excel normalizado para Power BI.
- Clips selectivos con presets por jugador, equipo y cronología.
- Playbook en cuatro pasos: Diseñar, Secuencia, Explicar y Compartir.
- Paletas Tactovia, Arena, Océano y Grafito; tema automático, claro y oscuro.
- Guía completa dentro del perfil y en `docs/GUIA-USUARIO.md`.

## Datos y privacidad

- SQLite usa esquema 3.
- Al guardar un proyecto con partido y acciones se crea una ficha histórica
  privada de su perfil.
- La ficha histórica no contiene vídeo, ruta, inicio, final ni ancla temporal.
- El proyecto `.scout.json` conserva el vídeo y permite seguir editando y crear
  clips.
- No existe catálogo oficial precargado, importador masivo, calendario ni
  partidos predichos.
- La migración elimina únicamente datos piloto sin usar. Todo dato relacionado
  con análisis reales se conserva.
- El perfil local no es todavía una cuenta cloud y no sincroniza entre equipos.

## Compatibilidad

Se conservan `com.scoutanalyzer.desktop`, la carpeta `scout-analyzer`, la base
`scoutanalyzer.db`, las claves históricas y `.scout.json`. Esto evita romper los
datos de versiones anteriores aunque la marca pública sea Tactovia.

Cada empaquetado limpia versiones y archivos intermedios de `release`. Solo
deben permanecer:

- `Tactovia-0.11.0-mac-arm64.dmg`
- `Tactovia-0.11.0-win-x64.exe`
- `Tactovia-0.11.0-win-x64.zip`

## Verificación de 0.11.0

- 40/40 pruebas automáticas.
- Base SQLite real en Electron:
  `DATABASE_OK version=3 teams=2 players=1 matches=1 events=1 histories=1 video=excluded privacy=private`.
- Vídeo real:
  `VIDEO_SEEK_OK duration=12.00 seek=7.25 playback=8.46 rate=2x ranges=1`.
- Compilación Vite de producción superada.
- Acceso, etiquetado, estadísticas, biblioteca, informes, guía y Playbook
  revisados visualmente sin errores de consola.
- DMG validado mediante su suma interna; EXE y ZIP generados y revisados
  estructuralmente. La ejecución física de Windows sigue pendiente.

## Referencias activas

- Resultado de esta versión: `TRASPASO-TACTOVIA-0.11.0.md`.
- Guía de usuario: `docs/GUIA-USUARIO.md`.
- Atajos: `docs/ATAJOS.md`.
- Base de datos: `docs/BASE-DATOS-0.6.md`.
- Playbook: `docs/PLAYBOOK-2.md`.
- Sistema visual: `docs/SISTEMA-VISUAL-0.7.md`.
- Marca: `BRAND_IMPLEMENTATION.md`.
- Hoja de ruta: `docs/ROADMAP.md`.

## Protocolo al cambiar de ordenador

1. Actualizar el repositorio.
2. Leer `AGENTS.md` y este archivo.
3. Trabajar y ejecutar pruebas, base real, vídeo real y compilación.
4. Actualizar este contexto cuando cambie el estado estable.
5. Guardar y subir los cambios.

Los vídeos, análisis `.scout.json`, datos locales, `node_modules`, `dist` y
`release` no se suben al repositorio.

## Siguientes prioridades

1. Probar físicamente la versión 0.11.0 en Windows x64.
2. Validar los flujos con dos o tres entrenadores reales.
3. Conectar estadísticas históricas de varios partidos en un único dashboard.
4. Decidir backend, cuentas, roles y sincronización entre ordenadores.
5. Crear highlights como un único vídeo.
6. Estudiar etiquetado asistido por IA con revisión humana obligatoria.
7. Firmar y notarizar instaladores antes de distribución comercial.
