# Base de datos local de Tactovia

## Modelo actual

Tactovia 0.11 utiliza SQLite como biblioteca local y separa los datos por
perfil. La interfaz ya no incluye un catálogo oficial precargado, importación
masiva, calendarios ni partidos predichos.

La biblioteca contiene exclusivamente:

- competiciones y temporadas creadas por el usuario;
- equipos, colores, logos y datos deportivos;
- jugadores con identidad global;
- relación del jugador con su equipo o estado de agente libre;
- proyectos editables y sus eventos;
- fichas históricas estadísticas de partidos finalizados.

## Dos niveles de guardado

El archivo `.scout.json` es el proyecto de trabajo. Conserva la referencia al
vídeo, la plantilla de etiquetas, el partido, las acciones y el Playbook.

Al guardar un proyecto con partido y acciones, SQLite crea además una ficha
histórica. Esa ficha elimina:

- el objeto y la ruta del vídeo;
- los tiempos de inicio y final;
- el ancla temporal necesaria para saltar o generar clips.

Así, el histórico permite comparar y exportar estadísticas sin duplicar el
vídeo ni convertir la biblioteca en una fuente de clips.

## Privacidad

- Cada ficha histórica incluye `owner_profile_id`.
- La aplicación consulta únicamente las fichas del perfil activo.
- La demo de desarrollo no escribe datos persistentes.
- Los datos no salen del ordenador.
- El archivo técnico conserva el nombre `scoutanalyzer.db` y la carpeta
  histórica `scout-analyzer` para no romper instalaciones existentes.

## Migración

El esquema actual es la versión 3. La actualización:

1. añade propiedad de perfil a los análisis;
2. crea la tabla `game_records`;
3. elimina únicamente el catálogo FBRM precargado que no esté relacionado con
   datos reales;
4. conserva cualquier equipo, jugador, partido o evento ya utilizado.

## Futuro online

Para sincronización entre ordenadores será necesario añadir un servicio de
cuentas y una base central. Antes de activarlo deberán definirse:

- organizaciones y roles;
- consentimiento y política de privacidad;
- resolución de conflictos;
- cifrado y copias de seguridad;
- reglas para compartir análisis y catálogos.

Los vídeos seguirían siendo locales salvo autorización expresa para una
función de almacenamiento remoto. Nunca debe incluirse una clave administrativa
del backend dentro de la aplicación de escritorio.
