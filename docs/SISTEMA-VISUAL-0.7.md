# Sistema visual de ScoutAnalyzer 0.7

Última actualización: 27 de julio de 2026

## Objetivo

La interfaz combina la claridad de las aplicaciones de productividad modernas
con las necesidades de una herramienta profesional de scouting. Se priorizan
la lectura rápida, la comodidad durante sesiones largas y la visibilidad de los
controles sobre los efectos decorativos.

## Principios

- Navegación y acciones principales visibles sin ocupar demasiado espacio.
- Tarjetas con radios amplios, bordes suaves y sombras contenidas.
- Efecto de cristal únicamente en navegación, cabeceras, resúmenes y modales.
- Fondos sólidos en vídeo, tablas y áreas de trabajo que exigen precisión.
- Naranja como acción principal, turquesa para estados correctos y colores de
  equipo o etiqueta cuando aportan contexto deportivo.
- Misma estructura y jerarquía en modo claro y oscuro.
- Foco visible, controles con nombre accesible y respeto por la preferencia de
  movimiento reducido del sistema.

## Temas

### Automático

Es el modo inicial. Consulta la preferencia de Windows o macOS y cambia entre
claro y oscuro cuando el sistema lo hace. No requiere reiniciar la aplicación.

### Claro

Utiliza un fondo gris frío, tarjetas blancas translúcidas y texto oscuro. El
vídeo continúa sobre negro y la pista mantiene sus colores para evitar cambios
en el contenido analizado.

### Oscuro

Utiliza superficies grafito, texto claro y contrastes suaves. No emplea negro
puro en todos los paneles para conservar jerarquía entre fondo, navegación,
tarjetas y controles.

La preferencia elegida se guarda únicamente en el ordenador.

## Componentes revisados

- cabecera, nombre del análisis y acciones de archivo;
- navegación principal;
- reproductor, etiquetas, controles y línea temporal;
- métricas, gráficos, filtros y tablas;
- biblioteca histórica y fichas FBRM;
- equipos, jugadores y formularios;
- Playbook en Dibujar, Animar, Notas y Presentación;
- informes, exportaciones, ajustes y ventanas modales.

## Comprobaciones

- cambio inmediato entre los tres modos;
- seguimiento correcto del tema del sistema;
- ausencia de desbordamiento horizontal a 1280 píxeles;
- legibilidad de campos, botones y tablas;
- contraste específico del Playbook en ambos temas;
- respeto por `prefers-reduced-motion`.
