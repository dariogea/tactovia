# Beta web privada

Decidido: baloncesto, espacio privado por usuario, vídeos locales. Sin colaboración
ni pagos inicialmente. Demo independiente, sin escritura en la nube.

## Secuencia

1. Crear proyecto Supabase en región UE y configurar dominio de la web.
2. Aplicar la migración incluida. Conectar Auth: registro, confirmación de correo,
   acceso, recuperación de contraseña y cierre de sesión.
3. Conectar análisis y biblioteca por separado. Antes de sincronizar, serializar
   solo datos admitidos: nunca rutas locales, contraseñas, blobs ni URLs de vídeo.
   Importar datos locales solo con confirmación; no migrar credenciales locales.
4. Guardar con control de revisión: UPDATE condicionado a revision conocida;
   si no modifica filas, mostrar conflicto y permitir conservar ambas copias.
5. Al abrir en otro ordenador, pedir seleccionar de nuevo el archivo de vídeo.
   Mostrar estado de guardado y conservar copia local cuando no haya conexión.
6. Antes de abrir beta: comprobar aislamiento entre dos usuarios y anónimo,
   recuperación de cuenta, conflictos y copias de seguridad. Estas pruebas de
   seguridad son necesarias aunque se reduzcan las comprobaciones visuales.

Solo URL y clave pública del proyecto en frontend. Nunca service_role.
Los controles de acceso se imponen en la base de datos, no en la interfaz.
Referencia: https://supabase.com/docs/guides/database/postgres/row-level-security

## Estado

Preparada migración inicial, aún NO aplicada. El navegador usa acceso online
cuando `.env.local` contiene las dos variables públicas de `.env.example` y se
recompila. Sin configuración conserva los perfiles locales. Electron conserva
el funcionamiento local. No hay servicio contratado ni despliegue público.

Implementados registro, acceso, petición de recuperación y nueva contraseña;
los enlaces de correo deben apuntar al Site URL de esta web, autorizado en Auth.
Configurar confirmación de correo, contraseña mínima de 10 caracteres y SMTP
antes de abrir la beta. Las sesiones solo viven en memoria: recargar exige
iniciar sesión de nuevo. No se guardan contraseñas online en el navegador.

Guardar online envía el análisis explícitamente; Abrir lista hasta 100 análisis
y permite eliminarlos con confirmación.
Se controla revision al actualizar y se ofrece guardar una copia ante conflictos.
Se mantiene autoguardado local separado por usuario para recuperación. No es
sincronización automática. Importar un archivo local no lo sube hasta Guardar.
La lista de campos admitidos excluye vídeos, rutas, credenciales, fotos, logos y
datos de contacto. Las notas escritas por el usuario sí se guardan en su análisis.
La biblioteca independiente se sincroniza con espera breve y copia local. Ante
conflicto no sobrescribe la versión remota. Imágenes, logos y datos de contacto
se mantienen locales. Pendientes: conectar proyecto real, comprobar RLS con dos
usuarios y paginar más de 100 análisis.

## Mapa

SVG propio, escala 32 px/m, media pista FIBA 15 × 14 m, triple 6,75 m,
esquinas a 0,90 m de la banda, pintura 4,90 m. Diez regiones analíticas;
su subdivisión táctica no es una clasificación oficial de FIBA. IDs conservados
para leer etiquetas anteriores; las zonas antiguas no se pueden recalcular sin
coordenadas originales. Referencia geométrica:
https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2024-v10a.pdf
