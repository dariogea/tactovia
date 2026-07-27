# Traspaso de ScoutAnalyzer 0.6.0

Última actualización: 27 de julio de 2026

## Resultado de esta versión

ScoutAnalyzer deja de guardar únicamente un análisis aislado y añade una
biblioteca relacional local. La aplicación puede conservar y relacionar:

- competiciones y temporadas;
- clubes, equipos y plantillas históricas;
- identidad única de jugadores;
- partidos;
- análisis privados;
- acciones etiquetadas.

El piloto está preparado para Primera División Masculina GESA FBRM, temporada
2026/27.

## Modelo de acceso acordado

- El catálogo deportivo oficial será compartido entre todos los usuarios
  registrados.
- Solo los administradores podrán modificar el catálogo oficial.
- Cada análisis será privado por defecto.
- Los análisis de club solo serán visibles para miembros autorizados.
- Un análisis únicamente será público mediante una acción explícita.
- Los vídeos, clips y rutas locales no se guardarán en la nube.

## Implementación local

La aplicación crea `scoutanalyzer.db` dentro de su carpeta privada de datos.
Utiliza SQLite en el proceso principal de Electron y no expone acceso directo a
la interfaz.

Al arrancar la versión 0.6.0:

1. crea o actualiza el esquema;
2. incorpora el análisis local anterior;
3. relaciona sus equipos, jugadores, partido y eventos;
4. mantiene una cola para la futura sincronización;
5. conserva el vídeo y el archivo `.scout.json` original.

La identidad del jugador está separada de `roster_memberships`. Esto permite que
un mismo jugador cambie de equipo, dorsal o posición entre temporadas sin
duplicar su histórico.

## Biblioteca

La nueva pestaña Biblioteca contiene cuatro vistas:

- Partidos: filtros por competición y acceso directo al etiquetado.
- Equipos: identidad, colores, plantilla y acciones acumuladas.
- Jugadores: dorsal actual, equipo y actividad histórica.
- Administración: plantilla Excel, importación y copia de seguridad.

La importación utiliza códigos estables para actualizar datos sin borrar los
análisis existentes. Los avisos de filas incompletas, relaciones incorrectas o
códigos duplicados se muestran después de cada importación. Los duplicados no
se incorporan para evitar mezclar identidades.

## Preparación cloud

`supabase/migrations/202607270001_scout_core.sql` define el futuro backend
PostgreSQL con:

- perfiles y espacios de trabajo;
- roles de usuario, administrador de club y administrador global;
- permisos de lectura y edición por fila;
- catálogo compartido;
- análisis privados, de club o públicos;
- eventos protegidos por los permisos de su análisis.

La nube no está activa todavía. Falta crear el proyecto Supabase bajo la cuenta
del producto, configurar las credenciales públicas, activar las cuentas y
conectar la cola de sincronización.

## Archivos principales

- `electron/database.cjs`: SQLite, migración, consultas y copias.
- `electron/catalog.cjs`: plantilla e importación Excel/CSV.
- `src/components/DatabaseLibrary.jsx`: interfaz de Biblioteca.
- `docs/BASE-DATOS-0.6.md`: arquitectura y procedimiento.
- `supabase/migrations/202607270001_scout_core.sql`: modelo cloud.
- `.env.example`: nombres de configuración pública, sin secretos.

## Verificación

- 32 pruebas automáticas.
- Copia y reapertura de una base SQLite.
- Prueba en el Electron real:
  `DATABASE_OK version=1 teams=2 players=1 matches=1 events=1 privacy=private`.
- Renderizado independiente de seis paneles.
- Compilación Vite de producción.
- Prueba multimedia:
  `VIDEO_SEEK_OK duration=12.00 seek=7.25 playback=8.46 rate=2x ranges=1`.
- DMG verificado internamente y paquete macOS confirmado como versión 0.6.0.
- Aplicación instalada y abierta desde `/Applications/ScoutAnalyzer.app`.
- Base real creada con esquema 1, competición piloto y análisis local migrado.
- La versión instalada 0.5.1 se movió a la Papelera.
- EXE y ZIP Windows x64 generados; el `app.asar` interno declara 0.6.0.

Windows continúa necesitando una prueba física.

## Paquetes 0.6.0

```text
ScoutAnalyzer-0.6.0-mac-arm64.dmg
ScoutAnalyzer-0.6.0-win-x64.exe
ScoutAnalyzer-0.6.0-win-x64.zip
```

Huellas SHA-256:

```text
4c029fbf467b9af72b5db9e3b1e7e21574a61c8de77ef7e364128f0530e87d0f  ScoutAnalyzer-0.6.0-mac-arm64.dmg
1c062b2c21ae4b9907f42c889dd4b003e47430cf2ac745cbfc6a949d9fcc209e  ScoutAnalyzer-0.6.0-win-x64.exe
6170b452ddfa19c458364d23e80637a4d66c4810769c39d97f7517658072e231  ScoutAnalyzer-0.6.0-win-x64.zip
```

## Siguiente fase recomendada

1. Conseguir el permiso o canal oficial para cargar datos FBRM.
2. Crear el proyecto Supabase y las cuentas del piloto.
3. Conectar la cola local con sincronización autenticada.
4. Construir el buscador histórico por jugador, equipo, etiqueta y partido.
5. Probar con una temporada real antes de ampliar a categorías FEB.
