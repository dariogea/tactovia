# Tactovia 0.13.0 · Studio

Entrega del 14 de septiembre de 2026.

## Qué cambia

Esta versión revisa el flujo completo de scouting local: preparar el partido,
etiquetar, revisar, interpretar y entregar resultados. Mantiene los datos
privados y no convierte el prototipo en un servicio cloud ficticio.

### Espacio de trabajo

- Navegación lateral con Inicio, Etiquetado, Sala de revisión, Estadísticas,
  Competiciones y equipos, Informe y exportación, y Perfil y ajustes.
- Diseño coherente en claro, oscuro y automático, cuatro paletas y modo de
  concentración. Iconos SVG propios, estados vacíos y mejor jerarquía visual.
- Buscador de comandos Cmd/Ctrl+K, diálogos con foco controlado y recuperación
  ante errores de interfaz.
- Inicio con partido, puntos etiquetados, indicadores, acciones recientes,
  pasos de trabajo y cuaderno del analista.

### Etiquetado y revisión

- Períodos reales, nuevas métricas de baloncesto y significado estadístico
  editable en cada etiqueta.
- Tiros etiquetables con el mapa oculto; conservación del partido al cambiar
  de archivo de vídeo y del punto de reproducción al navegar entre pantallas.
- Deshacer/rehacer, favoritos, búsqueda y cronología paginada.
- Sala de revisión con clips acotados, filtros, bucle, reproducción continua,
  selección y listas ordenadas guardadas dentro del análisis.
- Exportación del orden de la lista, con validación y límites del vídeo.

### Datos e informes

- Cálculos comunes entre pantallas, informes y Excel: puntos, FG, eFG,
  tiros libres, rebotes, asistencias, pérdidas, robos y tapones.
- Filtros de estadísticas y tabla individual sobre el partido abierto.
- Importación/exportación de biblioteca `.library.json` con vista previa,
  validación y fusión por identificador. El jugador conserva su identidad al
  cambiar de plantilla o pasar a agentes libres.
- Excel con eventos, resumen, zonas, tabla individual y notas. La variante
  Power BI añade dimensiones y una guía de relaciones; no es un archivo PBIX.
- PDF interpretativo con notas y todos los jugadores etiquetados; dossier
  visual apaisado y portal de vídeo con selección, grupos, calidades y reel.
- Las conclusiones son cálculos locales transparentes, no IA generativa.

### Fiabilidad y mantenimiento

- Migración de análisis a esquema 11 con validación de tiempos, etiquetas e
  identidades, manteniendo compatibles los archivos anteriores válidos.
- Biblioteca por perfil hidratada antes de guardar, recuperación diferida,
  control de errores de almacenamiento e IPC y aviso de cierre sin guardar.
- Métricas, migraciones, biblioteca, pantallas nuevas e informes extraídos a
  módulos específicos; código formateado y 39 reglas CSS obsoletas retiradas.
- PWA con precaché de los recursos de aplicación; se excluyen archivos de usuario,
  peticiones de vídeo y contenido por rangos.
- Los entregables antiguos se limpian solo tras crear correctamente los nuevos.

## Verificación ejecutada

| Área | Resultado |
| --- | --- |
| Pruebas de lógica | 51/51 |
| Recorrido integrado Electron | 20 comprobaciones |
| Componentes críticos | 9 renderizados |
| Vídeo real | salto a 7,25 s, reproducción ×2 y reel FFmpeg |
| Biblioteca SQLite real | esquema 4, relaciones e histórico privado correctos |
| Excel | 6 hojas; notas, puntos, favoritos y período comprobados |
| Power BI | dimensiones, identificadores y relaciones comprobados |
| PDF real | modalidades interpretativa y visual generadas |
| PWA | arranque sin conexión y ejemplo, 17 recursos precacheados |
| Apariencia | pantallas principales en claro/oscuro, tamaños 1000/640 px |
| Paquetes | DMG íntegro, ZIP íntegro, NSIS y versión interna 0.13.0 |

Los datos de prueba se crearon en ubicaciones temporales aisladas. No se han
utilizado vídeos o análisis personales para fabricar resultados de prueba.

## Instaladores

- `release/Tactovia-0.13.0-mac-arm64.dmg`
- `release/Tactovia-0.13.0-win-x64.exe`
- `release/Tactovia-0.13.0-win-x64.zip`

Estos archivos no se incluyen en Git. La distribución sigue sin firma comercial
ni notarización. El ejecutable Windows necesita una prueba física en Windows;
crear y comprobar su estructura desde Mac no sustituye esa validación.

En el Mac de trabajo, `/Applications/Tactovia.app` se ha actualizado y abierto
correctamente. Se comprobó el acceso demo y el inicio con partido de ejemplo
desde la aplicación instalada, conservando el perfil local existente.

## Límites explícitos

- Las cuentas y los datos son locales. No hay autenticación remota,
  sincronización, colaboración online ni recuperación por correo.
- Baloncesto es el deporte operativo. El Playbook permanece retirado.
- Los indicadores son tan completos como el etiquetado; no equivalen a un acta
  oficial si faltan acciones. No se inventan períodos de partidos antiguos.
- La demo contiene 64 acciones ficticias y no incluye vídeo.
- La web necesita una primera carga completa para funcionar sin conexión.
  Exportar PDF, Excel y vídeo codificado requiere escritorio.
- No se ha realizado una auditoría de seguridad externa, prueba física Windows
  ni campaña extensa de uso con entrenadores. No se afirma ausencia absoluta
  de errores ni preparación para un despliegue comercial multiusuario.

## Continuar desde otro ordenador

Leer `AGENTS.md`, `PROJECT_CONTEXT.md` y esta entrega antes de modificar.
Actualizar dependencias, ejecutar las pruebas y compilar. Los análisis
`.scout.json`, bibliotecas y vídeos se trasladan por separado y nunca se añaden
al repositorio de código.

Las siguientes prioridades son validación con usuarios y Windows, firma de los
instaladores y diseño explícito del backend antes de ofrecer cuentas online.
