# Guía de usuario de Tactovia 0.12

## 1. Acceder

Puedes iniciar sesión con un perfil local, crear uno nuevo o pulsar **Entrar en
la demo**. La demo no exige registro y utiliza un espacio temporal sin histórico
de perfil. Después selecciona **Baloncesto** y elige entre una sesión nueva o un
archivo `.scout.json` guardado.

En navegador, Tactovia puede instalarse como webapp. Los datos siguen siendo
locales; no existe todavía sincronización entre ordenadores.

## 2. Biblioteca personal

**Competiciones y equipos** es independiente del análisis abierto. Funciona como
un explorador de carpetas:

1. Crea carpetas con la organización que prefieras.
2. Crea una competición y guárdala dentro de una carpeta.
3. Añade equipos, colores, logo, ciudad, pabellón, cuerpo técnico y temporada.
4. Completa cada plantilla manualmente o con una plantilla rápida.
5. Abre la ficha de un jugador para consultar información, cambiarlo de equipo o
   dejarlo como agente libre.

Los partidos guardados aparecen en **Partidos analizados**; no se generan
partidos predichos.

## 3. Preparar un partido

1. Selecciona el vídeo local.
2. Elige los dos equipos.
3. Marca una convocatoria de entre 5 y 12 jugadores por equipo.
4. Si el equipo aún no existe, créalo desde el mismo configurador.

La biblioteca se copia como referencia al nuevo análisis, pero sus carpetas y
fichas continúan perteneciendo al perfil.

## 4. Etiquetar

- De forma predeterminada se muestran −10 s, reproducir/pausar, +10 s y volumen.
- Activa saltos, fotogramas, velocidades y navegación por eventos desde Ajustes.
- El botón **Atajos** está junto al reproductor; la guía completa también está
  en [ATAJOS.md](ATAJOS.md).
- Selecciona equipo, jugador y una etiqueta. Para tiros, activa el mapa y pulsa
  una zona.
- El mapa se oculta por defecto. Ajustes permite mostrarlo, cambiar su posición y
  ver sus nombres. Un doble clic elimina la zona seleccionada.
- Las zonas muestran volumen y acierto del partido y forman el mapa caliente.
- El resumen bajo el vídeo puede mostrar acciones, etiquetas, jugadores, tiempo
  etiquetado, zonas, marcador, ritmo, tiro, cobertura y última acción.
- Ordena la cronología pulsando cualquier cabecera y abre fichas desde sus datos.

## 5. Guardar y recuperar

**Guardar** crea un `.scout.json` con partido, convocatoria, etiquetas, zonas y
acciones. Al abrirlo se reconstruyen automáticamente las estadísticas. En un
perfil real, guardar un partido con acciones añade además una ficha histórica
privada sin vídeo, ruta ni tiempos de clip.

En la web se descarga el archivo al dispositivo. En escritorio se conserva su
ruta y puede actualizarse directamente.

## 6. Estadísticas del partido

El panel solo analiza el partido abierto. Si no hay dos equipos y acciones
etiquetadas, muestra un estado vacío en lugar de mezclar datos de la biblioteca.

Puedes filtrar equipo, jugador y etiqueta; cambiar entre resumen, tiro y calidad
del dato; activar visuales y consultar KPIs, evolución, rankings y zonas. Los
colores se adaptan a los equipos del encuentro.

## 7. Informe y exportación

El portal se divide en cuatro entregables:

1. **Análisis IA**: conclusiones locales de equipo y jugador basadas únicamente
   en las etiquetas. Indica la calidad y límites de la muestra.
2. **Visuales**: dossier PDF apaisado con KPIs y gráficos del partido, casi sin
   texto.
3. **Vídeo**: filtra por etiqueta, equipo o jugador; exporta una selección, todas
   las acciones, clips separados o un único vídeo de highlights; elige calidad,
   orden y carpetas.
4. **Datos**: CSV, Excel y libro normalizado para Power BI.

PDF, Excel, Power BI y vídeo codificado requieren la app de escritorio. La
webapp permite guardar el análisis y exportar CSV.

## 8. Perfil, apariencia y controles

Desde el avatar abre **Perfil y ajustes** para configurar:

- tema automático, claro u oscuro;
- paletas Tactovia, Arena, Océano o Grafito;
- visibilidad y posición del mapa;
- módulos del resumen en directo;
- controles visibles del reproductor;
- saltos, fotogramas y atajos personalizados;
- datos del perfil y sesión.

Los ajustes de la demo se reinician al volver a entrar.
