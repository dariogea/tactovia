# Revisión visual 0.13.1

Se mantiene el diseño Studio, afinando su acabado sin cambiar los análisis ni
la biblioteca del usuario.

## Ajustes

- Eliminado Balonmano del selector y equilibradas las tarjetas restantes.
- Mayor contraste de textos secundarios y acentos de Arena, Océano y Grafito
  sobre fondos oscuros.
- Volumen compacto con icono vectorial y porcentaje junto a la barra.
- Resumen de etiquetado adaptable, descripciones completas y última acción
  alineada a ancho completo, sin tarjetas aisladas.
- Atajos expresados como «Mayús + ←» y «Espacio», manteniendo intactas las
  combinaciones guardadas. Teclas de la guía legibles en ambos temas.
- Avisos no bloqueantes detrás de los diálogos, sin tapar sus botones.
- Contadores con singular/plural y «intentos registrados» para incluir tiros
  sin una zona asignada.
- Caché web versionada para distribuir correctamente los recursos nuevos.
- Selector de equipos adaptable con nombres largos, sin desbordamiento del
  equipo visitante; título del análisis abreviado visualmente con nombre
  completo disponible al situar el puntero y al editarlo.

## Cobertura

Capturas y detección de desbordamientos sobre Inicio, Etiquetado, Revisión,
Estadísticas, Biblioteca, Informes y las cuatro pestañas de Ajustes. Anchuras:
1440, 1000 y 640 px. Temas claro/oscuro y las cuatro paletas.

Revisión adicional de las pestañas de estadísticas e informes, configuración
de etiquetas, guía, exportación de clips, preparación del partido y nombres
largos. Las tablas extensas conservan desplazamiento horizontal deliberado;
no se ocultan columnas para simular que caben.

52 pruebas de lógica superadas. Navegación y highlights con vídeo real
comprobados. Tema automático comprobado al emular la preferencia del sistema en
claro y oscuro. Arranque PWA sin conexión comprobado.

Resultado final: 120 escenarios visuales cubiertos entre la matriz general y
el repaso de detalle; la última pasada de 52 escenarios detallados terminó sin
desbordamientos ni recortes involuntarios detectados. Recorrido funcional:
22 comprobaciones superadas.

Esta revisión no sustituye las pruebas físicas pendientes en Windows ni implica
una certificación universal de accesibilidad o de ausencia absoluta de fallos.
