# Base de datos de ScoutAnalyzer 0.6

## Decisión de producto

El MVP comienza con Primera División Masculina GESA FBRM, temporada 2026/27.
La base tiene dos capas:

1. Un catálogo compartido en PostgreSQL/Supabase para competiciones, equipos,
   jugadores, plantillas, partidos y estadísticas oficiales.
2. Una caché SQLite dentro de la aplicación para trabajar sin conexión y
   conservar el histórico local.

Los vídeos, clips y rutas del ordenador nunca se envían a la base compartida.

## Permisos

- Todo usuario registrado puede consultar el catálogo oficial.
- Solo los administradores pueden modificar los datos oficiales.
- Cada análisis es privado por defecto.
- Los miembros autorizados de un club pueden consultar o editar los análisis
  de su espacio de trabajo según su rol.
- Un análisis solo es público cuando su propietario lo publica expresamente.

Las políticas se encuentran en:

`supabase/migrations/202607270001_scout_core.sql`

## Datos locales

La aplicación crea automáticamente `scoutanalyzer.db` dentro de la carpeta
privada de datos de ScoutAnalyzer en macOS o Windows. Al arrancar por primera
vez:

- migra los equipos, jugadores, partido y eventos del análisis actual;
- crea la competición piloto FBRM 2026/27;
- mantiene una cola de cambios pendientes para la futura sincronización.

La pestaña Biblioteca permite crear una copia de seguridad del archivo. Esa
copia no contiene los vídeos.

## Importación administrativa

Desde Biblioteca → Administración:

1. Guardar la plantilla Excel.
2. Completar primero Equipos.
3. Completar Jugadores usando `codigo_equipo`.
4. Completar Partidos usando `codigo_local` y `codigo_visitante`.
5. Importar el libro en ScoutAnalyzer.

Los códigos deben ser únicos y mantenerse estables entre importaciones. El
importador actualiza los registros existentes sin borrar sus análisis.

No deben importarse datos personales innecesarios, logos o fotografías sin
autorización.

## Activación de la nube

La estructura cloud ya está definida, pero el repositorio no contiene
credenciales. Para activar la sincronización:

1. Crear un proyecto de Supabase bajo la cuenta del producto.
2. Ejecutar la migración SQL.
3. Configurar URL y clave pública `anon`.
4. Activar las cuentas de usuario.
5. Validar las políticas con tres perfiles: usuario, club y administrador.
6. Conectar y probar la cola local de sincronización.

Nunca se debe incluir la clave `service_role` dentro de la aplicación.
