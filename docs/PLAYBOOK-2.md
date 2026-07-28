# Guía del Playbook

El Playbook permite diseñar, animar, explicar y exportar jugadas sin salir de
Tactovia. Todo se guarda dentro del análisis local `.scout.json`.

## Crear una jugada

1. Abre **Playbook**.
2. Pulsa `+` en la biblioteca o dentro de una carpeta.
3. Elige media pista, pista completa horizontal o vertical.
4. Selecciona una formación inicial o una pista vacía.
5. Pulsa **Empezar a dibujar**.

Las carpetas pueden ser personales o estar vinculadas a un equipo. Las jugadas
también se pueden duplicar, mover de carpeta o asociar a un equipo.

## Diseñar

- La media pista aparece en orientación vertical, con la canasta en la parte
  superior y el semicírculo de medio campo en la parte inferior.
- El parqué se dibuja de forma nativa con tablones de madera y conserva los
  colores configurables de pista, zona y líneas.
- Selecciona **Ataque** o **Defensa** antes de colocar un jugador.
- Activa **Jugador con balón** si quieres marcar la posesión.
- Puedes utilizar jugadores neutros del 1 al 5 o jugadores reales del equipo.
- Pulsa una herramienta y después haz clic o arrastra sobre la pista.
- Con **Seleccionar** puedes mover cualquier elemento.
- La tecla `Supr` o `Retroceso` elimina el elemento seleccionado.

Las jugadas guardadas con la antigua media pista horizontal se convierten una
sola vez al nuevo sistema. Se recolocan tanto los objetos como los recorridos de
las acciones, sin cambiar sus tiempos ni sus relaciones entre jugadores.

Acciones disponibles:

- **Bote**: desplazamiento del jugador manteniendo la posesión.
- **Pase**: trayectoria del balón hacia otro jugador.
- **Corte**: desplazamiento sin bote.
- **Bloqueo**: movimiento terminado con el símbolo de pantalla.
- **Tiro**: trayectoria del lanzamiento.
- **Mano a mano**: desplazamiento y cambio de posesión.

Para crear una acción, selecciónala y arrastra desde el jugador que la realiza
hasta el destino. El inspector permite cambiar color, inicio y duración.

## Fases

- **Siguiente inteligente** aplica los movimientos y cambios de balón de la fase
  actual y crea el estado siguiente.
- **Duplicar** copia objetos, acciones y notas.
- **Vacía** añade una fase sin elementos.
- **Reflejar** invierte la fase sobre la pista.
- Las flechas permiten cambiar su orden.

## Secuencia

El modo **Secuencia** reproduce la fase actual o toda la jugada. Cada acción tiene:

- Orden.
- Segundo de inicio.
- Duración.

La duración total de la fase se puede establecer manualmente o calcular con
**Ajustar automáticamente**. También se puede mostrar u ocultar el título de la
fase y reproducir a 0,5×, 1×, 1,5× o 2×.

## Explicar

La jugada y cada fase disponen de:

- Descripción.
- Texto libre.
- Títulos.
- Listas de comprobación.
- Archivos locales de vídeo, imagen, audio o PDF.
- Enlaces de referencia o YouTube.

Los archivos adjuntos se conservan como referencias a su ubicación original.
Si se trasladan a otro ordenador, deben copiarse por separado.

## Compartir

La vista **Clásica** genera un documento preparado para usar. La vista
**Avanzada** permite ordenar bloques de descripción, fases, notas, recursos o
texto personalizado.

Formatos:

- **PNG**: imagen de la fase seleccionada.
- **PDF**: documento completo con todas las fases.
- **WebM**: vídeo animado de la jugada completa.
- **Copiar resumen**: texto preparado para compartir por mensajería o correo.

Los enlaces públicos requerirán la futura sincronización de Tactovia. En
esta versión, todos los datos siguen siendo locales.
