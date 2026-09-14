# Guía de usuario de Tactovia 0.13 · Studio

## 1. Acceder

Puedes iniciar sesión con un perfil local, crear uno nuevo o pulsar **Entrar en
la demo**. La demo no exige registro y utiliza un espacio temporal sin histórico
de perfil. Después selecciona **Baloncesto** y elige entre una sesión nueva o un
archivo `.scout.json` guardado.

**Explorar ejemplo** abre un encuentro ficticio con 64 acciones,
plantillas, notas y una lista de revisión. Permite conocer las pantallas sin
preparar datos; para reproducir clips debes seleccionar un vídeo local.

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

**Importar biblioteca** permite cargar un `.library.json`, revisar cuántas
competiciones, equipos y jugadores contiene y confirmar su incorporación.
Los registros con el mismo identificador se actualizan; los demás se conservan.
Los traspasos mantienen la identidad del jugador. Exporta la biblioteca para
llevarla a otro perfil u ordenador: no incluye vídeos ni análisis guardados.

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
- El botón de ayuda del reproductor abre los atajos; la guía completa también está
  en [ATAJOS.md](ATAJOS.md).
- Selecciona el período real del encuentro, equipo, jugador y una etiqueta.
  Puedes etiquetar un tiro sin zona. Si activas el mapa, selecciona su origen
  para añadirlo al análisis espacial.
- El mapa se oculta por defecto. Ajustes permite mostrarlo, cambiar su posición y
  ver sus nombres. Un doble clic elimina la zona seleccionada.
- Las zonas muestran volumen y acierto del partido y forman el mapa caliente.
- El resumen bajo el vídeo puede mostrar acciones, etiquetas, jugadores, tiempo
  etiquetado, zonas, marcador, ritmo, tiro, cobertura y última acción.
- Ordena la cronología pulsando cualquier cabecera y abre fichas desde sus datos.
- Busca acciones por texto y marca las importantes como favoritas. La cronología
  muestra 50 acciones por página para conservar agilidad en partidos extensos.
- Deshaz o rehace las últimas modificaciones con `Cmd/Ctrl + Z` y
  `Cmd/Ctrl + Mayús + Z` (hasta 50 estados mientras la sesión está abierta).
- Al configurar una etiqueta, elige su significado estadístico; una etiqueta
  táctica puede quedar sin métrica. No dependes únicamente de su nombre.

## 5. Guardar y recuperar

**Guardar** crea un `.scout.json` con partido, convocatoria, etiquetas, zonas,
acciones, favoritos, listas, notas del analista y posición del vídeo. Al abrirlo
se reconstruyen automáticamente las estadísticas. En un
perfil real, guardar un partido con acciones añade además una ficha histórica
privada sin vídeo, ruta ni tiempos de clip.

En la web se descarga el archivo al dispositivo. En escritorio se conserva su
ruta y puede actualizarse directamente.

El vídeo no se incorpora al archivo de análisis. Si cambia de ubicación, vuelve
a seleccionarlo: se conserva el partido. El autoguardado ayuda a recuperar
trabajo, pero no sustituye una copia explícita del archivo. Al cerrar con cambios
sin guardar se muestra una advertencia.

## 6. Estadísticas del partido

El panel solo analiza el partido abierto. Si no hay dos equipos y acciones
etiquetadas, muestra un estado vacío en lugar de mezclar datos de la biblioteca.

Puedes filtrar equipo, jugador, etiqueta y período; cambiar entre resumen, tiro,
jugadores y calidad del dato; activar visuales y consultar KPIs, evolución,
rankings y zonas. Los colores se adaptan a los equipos del encuentro.

La tabla individual incluye puntos, tiros de campo y libres, rebotes,
asistencias, pérdidas, robos y tapones según lo registrado. Los tiros sin zona
siguen contando para el acierto y el eFG%; los tiros libres no se mezclan con los
tiros de campo. Los períodos no se deducen de la duración del vídeo: debes
asignarlos al etiquetar o editar cada acción. Los partidos anteriores pueden
contener acciones sin período.

Estas cifras describen las acciones etiquetadas, no una estadística oficial
completa cuando falten registros.

## 7. Inicio y sala de revisión

**Inicio** reúne el partido actual, sus indicadores, acciones recientes y el
cuaderno del analista. Escribe aquí observaciones que quieras conservar y
exportar con el informe.

En **Sala de revisión**:

1. Filtra por texto, equipo, etiqueta, período o favoritos.
2. Selecciona una acción para reproducir exclusivamente su fragmento.
3. Activa reproducción continua o bucle según el trabajo que estés realizando.
4. Guarda una lista, dale un nombre y ajusta el orden de sus acciones.
5. Exporta la selección o la lista conservando ese orden.

Las listas y los favoritos pertenecen al análisis abierto y se conservan al
guardar su `.scout.json`.

## 8. Informe y exportación

El portal se divide en cuatro entregables:

1. **Conclusiones automáticas**: interpretación local de equipo y jugador basada
   únicamente en las etiquetas. Indica la calidad y límites de la muestra e
   incorpora las notas del analista. No es un servicio de IA generativa.
2. **Visuales**: dossier PDF apaisado con KPIs y gráficos del partido, casi sin
   texto.
3. **Vídeo**: filtra por etiqueta, equipo o jugador; exporta una selección, todas
   las acciones, clips separados o un único vídeo de highlights; elige calidad,
   orden y carpetas.
4. **Datos**: CSV, Excel con detalle individual y notas, y libro normalizado para
   Power BI. Este último añade tablas de equipos, jugadores, etiquetas, períodos
   y partido, con identificadores y una guía de relaciones. No es un `.pbix`.

PDF, Excel, Power BI y vídeo codificado requieren la app de escritorio. La
webapp permite guardar el análisis y exportar CSV.

## 9. Perfil, apariencia y controles

Desde el avatar abre **Perfil y ajustes** para configurar:

- tema automático, claro u oscuro;
- paletas Tactovia, Arena, Océano o Grafito;
- visibilidad y posición del mapa;
- módulos del resumen en directo;
- controles visibles del reproductor;
- saltos, fotogramas y atajos personalizados;
- datos del perfil y sesión.

Los ajustes de la demo se reinician al volver a entrar.

Abre el buscador de acciones con `Cmd/Ctrl + K` para ir a una pantalla, guardar
o ejecutar operaciones sin recorrer menús. Puedes recorrer sus resultados con
las flechas y cerrarlo con `Esc`. El modo de concentración amplía el espacio
disponible para trabajar.

## 10. Seguridad del trabajo

- Guarda periódicamente el `.scout.json` y una copia de tu biblioteca.
- No compartas una biblioteca sin revisar los datos personales que contiene.
- La cuenta es local: no hay recuperación de contraseña por correo ni nube.
- En navegador, el modo sin conexión requiere una primera carga completa. Tus
  vídeos no se copian a la caché; vuelves a seleccionarlos cuando sea necesario.
