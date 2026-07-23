# Revisión del feedback — ScoutAnalyzer 0.4

## Etiquetado

- El vídeo se sirve por rangos y se valida con una prueba real que salta al
  segundo 7,25 y continúa reproduciendo.
- La barra superior y la línea temporal inferior permiten pulsar y arrastrar
  para cambiar de momento.
- Por defecto solo se muestran `−10 s`, `Reproducir/Pausar` y `+10 s`.
- El resto de controles se puede activar desde Ajustes.
- Solo existe el campo Nota rápida; no hay Resultado ni Descriptor.
- Los jugadores aparecen ordenados por dorsal.
- Después de elegir un vídeo es obligatorio seleccionar dos equipos distintos.
  El mismo diálogo permite crear equipos o abrir sus fichas.

## Estadísticas

- Ámbito de partido, equipo o jugador.
- Gráficos de barras, anillo y evolución temporal.
- Recuento o duración acumulada.
- Color por equipo, por etiqueta o personalizado.
- Las opciones del gráfico se conservan al cambiar de pestaña.
- Comparativas de equipos y jugadores con logos, fotos y colores del club.

## Equipos y jugadores

- Vista rápida y detallada independientes para equipos.
- Vista rápida y detallada independientes para jugadores.
- Logo de club, fotografía de jugador, colores e información deportiva.
- Plantillas siempre ordenadas por dorsal.

## Playbook

- Biblioteca con buscador, carpetas personales y carpetas vinculadas a equipos.
- Guardado explícito, duplicado y eliminación de jugadas.
- Media pista o pista completa con colores y grosor de línea editables.
- Jugadores neutros del 1 al 5 y jugadores reales de las plantillas.
- Selección y movimiento de elementos ya dibujados.
- Varias fases; cada fase nueva copia la anterior para recolocar jugadores.
- Flechas, líneas, balón, texto, descripción y notas del entrenador.
- Exportación de la fase actual a PNG y de todas las fases a PDF.

### Evolución Playbook 2.0 — versión 0.5

- Cuatro modos profesionales: Dibujar, Animar, Notas y Presentación.
- Plantillas Vacía, Tradicional, 5 abiertos, Princeton, Box, 1-4 bajo, Horns,
  1-4 alto, Flex y defensas zonales 2-3, 3-2 y 1-3-1.
- Pistas de media cancha, completa horizontal y completa vertical.
- Jugadores de ataque, defensa, con balón, neutros o vinculados a la plantilla.
- Acciones específicas: bote, pase, corte, bloqueo, tiro y mano a mano.
- Cronología editable con inicio, duración, orden y velocidad de reproducción.
- Fases inteligentes que aplican movimientos y transferencias de balón.
- Fases duplicadas, vacías, reflejadas, reordenables y eliminables.
- Objetos adicionales: cono, aro, rectángulo, círculo, triángulo e imagen.
- Descripción y notas estructuradas tanto para la jugada como para cada fase.
- Recursos locales y enlaces asociados a la jugada o a una fase concreta.
- Presentación clásica o mediante bloques configurables.
- Exportación PNG, PDF y vídeo animado WebM.
- Migración automática de las jugadas creadas con el Playbook anterior.

## Informe, exportación y ajustes

- Una sola tarjeta de datos con selector CSV/XLSX.
- Clips: todos o selección manual, orden configurado y carpetas por etiqueta,
  equipo o jugador.
- Tamaños de interfaz y etiquetas expresados como Pequeño, Mediano o Grande.
- Catálogo completo de botones existentes para decidir cuáles se muestran.
- Guía editable de atajos para saltos, fotogramas, volumen, eventos y
  velocidades de 0,5× a 16×.

## Instalación y archivos generados

- La versión de mantenimiento 0.4.1 restaura los comandos completos de
  desarrollo y empaquetado.
- Una compilación nueva elimina automáticamente los instaladores antiguos.
- Solo se conservan el DMG actual, el instalador de Windows y el ZIP portable.
- Se eliminan carpetas desempaquetadas, `blockmaps` e informes temporales.
- Windows utiliza una única ubicación de instalación.
- macOS mueve a la Papelera otras copias instaladas de ScoutAnalyzer con una
  versión igual o anterior.
