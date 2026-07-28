# Guía de usuario de Tactovia 0.11

## 1. Acceder

Tactovia admite varios perfiles locales en un mismo ordenador. Cada perfil
mantiene separados sus equipos, competiciones, proyectos recuperables e
histórico de partidos.

1. Elige **Iniciar sesión** para abrir un perfil existente o **Crear cuenta**.
2. Introduce nombre, correo y una contraseña local de al menos seis caracteres.
3. Selecciona **Baloncesto**.
4. Crea una sesión, continúa el autoguardado o abre un archivo `.scout.json`.

La demo efímera solo aparece al ejecutar la versión de desarrollo. No guarda
cuentas, equipos, preferencias ni históricos.

## 2. Crear la biblioteca

En **Competiciones y equipos**:

1. Crea una competición e indica su temporada.
2. Crea un equipo, asígnalo a la competición y completa colores, ciudad,
   pabellón, cuerpo técnico y logo.
3. Añade jugadores manualmente o usa una de las cuatro plantillas de 5, 8, 10
   o 12 jugadores.
4. Completa dorsal, nombre, posición, altura, nacionalidad, fotografía y notas.

Un jugador conserva su identidad al cambiar de equipo. Desde su ficha puedes
traspasarlo a otro equipo o dejarlo como agente libre. Los agentes libres pueden
firmar posteriormente por cualquier equipo del perfil.

## 3. Preparar un partido

1. Selecciona un vídeo local.
2. Elige equipo local y visitante.
3. Marca una convocatoria de entre 5 y 12 jugadores por equipo.
4. Si un equipo no alcanza cinco jugadores, completa primero su plantilla.

La camiseta de cada jugador utiliza el color principal del equipo y el dorsal,
el color secundario.

## 4. Etiquetar

1. Sitúa el vídeo con los controles, la línea de reproducción o los atajos.
2. Selecciona equipo y jugador mediante su camiseta.
3. Para una acción de tiro, selecciona una de las diez zonas de la pista.
4. Añade una nota rápida si necesitas contexto cualitativo.
5. Pulsa una etiqueta:
   - las etiquetas de instante crean la acción al momento;
   - las etiquetas de intervalo comienzan con una pulsación y terminan con otra.
6. Ordena la tabla pulsando el título de cualquier columna.
7. Pulsa la información de una etiqueta, equipo o jugador para abrir su ficha.

El mapa puede situarse encima o debajo de las etiquetas, ocultarse y mostrar u
ocultar sus nombres. Un doble clic elimina la zona seleccionada.

## 5. Guardar e histórico

**Guardar** crea un proyecto `.scout.json` editable. Si ya existen partido y
acciones, crea también una ficha histórica privada para el perfil.

La ficha histórica contiene:

- equipos y jugadores;
- acciones estadísticas;
- recuentos y zonas;
- fecha y resumen del partido.

No contiene vídeo, ruta local, inicio, final ni ancla temporal. Por tanto no
permite abrir el vídeo ni exportar clips. Se puede consultar, exportar o borrar
desde **Competiciones y equipos → Partidos analizados**.

## 6. Estadísticas

El panel funciona como un informe interactivo:

- filtra por partido, equipo, jugador y etiqueta;
- cambia entre Resumen, Tiro y zonas y Calidad del dato;
- activa u oculta evolución, etiquetas, equipos y jugadores;
- consulta KPIs, tendencias, rankings y distribución espacial.

Los colores de equipos y visuales se aplican automáticamente cuando existe una
selección compatible.

## 7. Informes, datos y clips

En **Informe y exportación**:

- elige las secciones del PDF: resumen, etiquetas, mapa de tiro, jugadores,
  cronología y notas;
- exporta CSV o Excel;
- genera un Excel normalizado para cargarlo en Power BI;
- selecciona acciones concretas para clips;
- usa presets por jugador, equipo o cronología.

El formato `.pbix` es propietario de Microsoft y no se genera. El libro
preparado para Power BI contiene tablas normalizadas listas para importación.

## 8. Playbook

El flujo se divide en:

1. **Diseñar**: pista, formación, jugadores, acciones y objetos.
2. **Secuencia**: fases, tiempos y animación.
3. **Explicar**: descripción y notas.
4. **Compartir**: PNG, PDF, vídeo WebM o resumen.

Los jugadores neutros del 1 al 5 permiten diseñar sin asociar una plantilla. Las
fases mantienen la posición final de los jugadores y permiten continuar,
duplicar, reflejar o reorganizar la jugada.

## 9. Apariencia y controles

Desde el menú del perfil abre **Perfil y ajustes** para elegir:

- modo automático, claro u oscuro;
- paletas Tactovia, Arena, Océano o Grafito;
- posición y visibilidad del mapa;
- módulos del resumen en directo;
- botones visibles del reproductor;
- saltos, fotogramas y atajos personalizados.

La lista completa de atajos está en [ATAJOS.md](ATAJOS.md) y también dentro de
**Perfil → Guía de usuario**.
