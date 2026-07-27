# Implementación de marca Tactovia

Última actualización: 28 de julio de 2026
Versión de aplicación: 0.10.0

## Diagnóstico

La aplicación es un producto de escritorio construido con Electron, React y
Vite. Electron controla archivos locales, base de datos, vídeo, exportaciones e
instaladores; React contiene la interfaz; Vite genera el paquete web que
Electron muestra dentro de la ventana.

La identidad anterior no utilizaba archivos de logotipo. El símbolo de
ScoutAnalyzer se construía con CSS y el nombre aparecía como texto en acceso,
cabecera, exportaciones, diálogos, metadatos y documentación. El color se
gestionaba principalmente mediante variables globales en `src/styles.css` y
preferencias en `src/lib/theme.js`.

## Fuente maestra

La fuente canónica se encuentra fuera del código de la aplicación, en:

`../tactovia-logo-system/`

Los originales no se modifican. La aplicación contiene únicamente copias de las
variantes necesarias.

## Recursos utilizados

| Contexto | Variante | Ubicación en la aplicación |
| --- | --- | --- |
| Cabecera clara | Horizontal principal | `public/brand/tactovia-horizontal-primary.svg` |
| Cabecera Game Ink | Horizontal on-ink | `public/brand/tactovia-horizontal-on-ink.svg` |
| Fondo oscuro no controlado | Horizontal negativa | `public/brand/tactovia-horizontal-negative.svg` |
| Acceso y onboarding | Apilada principal o negativa | `public/brand/tactovia-stacked-*.svg` |
| Navegación compacta y reserva | Símbolo principal o negativo | `public/brand/tactovia-symbol-*.svg` |
| Favicon | Símbolo simplificado SVG, PNG 16 y 32 | `public/brand/` |
| Introducción | Animación SVG oficial | `public/brand/tactovia-logo-animated.svg` |
| Aplicación macOS | ICNS oficial | `build/icons/tactovia-macos.icns` |
| Aplicación Windows | ICO oficial | `build/icons/tactovia-windows.ico` |
| Ventana en desarrollo | PNG de 512 px | `build/icons/tactovia-app-icon-512.png` |

`src/components/Brand.jsx` centraliza la selección de variantes para evitar
relaciones de aspecto incorrectas o decisiones distintas en cada pantalla.

## Aplicación de la identidad

- Nombre público, ventana, ejecutables e instaladores: **Tactovia**.
- Descriptor: **Plataforma de análisis deportivo**.
- Claim de acceso: **Ve el juego. Decide mejor.**
- Claim funcional: **Del vídeo a la decisión.**
- Cabecera adaptable con logo principal en claro y `on-ink` en oscuro.
- Acceso con logo apilado y una composición sobria sobre Game Ink.
- Introducción animada una vez por arranque; con movimiento reducido se utiliza
  una versión estática y una transición abreviada.
- Sección “Acerca de Tactovia” dentro de Perfil y ajustes.
- Favicon y metadatos preparados para la interfaz web de Vite.
- Informes PDF, libros Excel, plantillas de importación y textos visibles
  identificados como Tactovia.

## Tokens de color

Los colores se declaran como variables globales en `src/styles.css` y como
valores exportables en `src/lib/theme.js`.

| Token | Valor | Uso |
| --- | --- | --- |
| `--brand-game-ink` | `#0B1218` | Fondos oscuros y estructura |
| `--brand-strategic-teal` | `#08756D` | Acción principal y jerarquía |
| `--brand-signal-lime` | `#BDEB62` | Foco, selección y reproducción |
| `--brand-analysis-white` | `#F4F7F5` | Fondo claro y texto sobre oscuro |
| `--brand-slate` | `#64717C` | Información secundaria |

Los antiguos alias CSS `--accent`, `--orange` y `--teal` se conservan
internamente, pero ahora resuelven al sistema Tactovia. Esto permite actualizar
la interfaz completa sin reescribir cada componente ni romper estilos de
equipos, etiquetas o gráficos.

Los modos Automático, Claro y Oscuro continúan disponibles. Las antiguas paletas
Arena, Océano, Bosque y Violeta migran visualmente a la paleta Tactovia al
normalizar la preferencia guardada.

No se añadió una descarga de Sora o Inter. La interfaz mantiene su pila de
fuentes del sistema —Inter solo se utiliza si ya está disponible— para evitar
otra licencia, tráfico de red y peso de paquete. El wordmark oficial está
trazado dentro de los SVG y no depende de fuentes instaladas.

## Compatibilidad y referencias antiguas

Las siguientes referencias se conservan deliberadamente:

| Referencia | Motivo |
| --- | --- |
| Paquete `scout-analyzer` | Evita cambiar el nombre técnico y parte de la identidad de almacenamiento |
| `com.scoutanalyzer.desktop` | Mantiene la identidad de actualización, instalación y bundle |
| Carpeta `scout-analyzer` | Contiene perfiles, localStorage, preferencias, autoguardado y base real |
| `scoutanalyzer.db` | Base de datos SQLite existente |
| Claves `scout-analyzer-*-v*` | Permiten leer cuentas, tema, equipos, preferencias y sesiones previas |
| Protocolo `scout-media` | Mantiene la reproducción segura de vídeos locales |
| Extensión `.scout.json` | Conserva todos los análisis ya guardados |
| Migración SQL `scout_core` | Es una referencia histórica de esquema |
| Documentos `TRASPASO-SCOUTANALYZER-*` | Registran versiones realmente publicadas con el nombre anterior |

Electron fija explícitamente `userData` en la carpeta histórica antes de
establecer el nombre público Tactovia. Windows conserva el mismo `appId` y macOS
localiza las copias antiguas mediante el mismo bundle ID, aunque tengan otro
nombre visible.

## Migraciones

- Las preferencias antiguas de paleta se normalizan a `tactovia`.
- No se copia ni se mueve la base de datos.
- No se modifican los archivos `.scout.json`.
- No se cambia el esquema SQLite.
- No se cambia el hash de las contraseñas locales ni su clave de almacenamiento.
- El nuevo instalador puede sustituir la aplicación anterior conservando su
  identidad técnica.

## Actualizar recursos en el futuro

1. Modificar y aprobar primero el sistema maestro externo.
2. No editar directamente los SVG que ya están en `public/brand`.
3. Copiar solo las nuevas variantes aprobadas manteniendo los nombres actuales,
   o actualizar `src/components/Brand.jsx` si cambia alguno.
4. Sustituir ICNS, ICO y PNG en `build/icons`.
5. Comprobar favicon a 16 y 32 px.
6. Revisar cabecera clara, cabecera oscura, acceso, introducción y “Acerca de”.
7. Ejecutar pruebas, compilación y empaquetado para ambas plataformas.

## Validación

- 45 pruebas automáticas superadas.
- Diez paneles y flujos renderizados de forma aislada.
- Compilación Vite de producción superada.
- Modos claro y oscuro comprobados visualmente.
- Logo principal, `on-ink`, apilado y animado comprobados sin deformación.
- Favicon oficial comprobado a 16 y 32 px.
- Ausencia de desbordamiento horizontal verificada en el tamaño normal y a
  1024 px.
- Título de documento `Tactovia`, paleta `tactovia` y splash de una sola
  ejecución comprobados en la interfaz.
- Conservación de la carpeta histórica cubierta por una prueba automática.
- Copia consistente de la base real reconocida con esquema 2, 20 equipos, 193
  jugadores, 13 partidos, seis análisis y 48 eventos.
- DMG 0.10.0 validado con `hdiutil verify`; su `Info.plist` declara Tactovia,
  versión 0.10.0, el icono oficial y el bundle ID compatible.
- EXE y ZIP 0.10.0 generados. El paquete portable contiene `Tactovia.exe`,
  `app.asar`, FFmpeg, el catálogo y los recursos de marca.
- Limpieza de `release` verificada: conserva únicamente DMG, EXE y ZIP 0.10.0.

Evidencias:

- `docs/brand-evidence/access-dark.png`
- `docs/brand-evidence/workspace-light.png`
- `docs/brand-evidence/about-dark.png`

Entregables y SHA-256:

| Archivo | SHA-256 |
| --- | --- |
| `Tactovia-0.10.0-mac-arm64.dmg` | `3c77af72841acee095a6291a0c1a42737f84507df93df13a56fcea63888f266a` |
| `Tactovia-0.10.0-win-x64.exe` | `17e36d2043a3b9476f79d88d4c813d69a55db618361b8bab1333f88dc0644abe` |
| `Tactovia-0.10.0-win-x64.zip` | `420e92503442decf578519b5612c19264348aff0652f0f4b907780b64813beab` |

## Pendientes antes de distribución comercial

- Validar legalmente el nombre Tactovia y el símbolo frente a marcas
  registradas.
- Firmar y notarizar los instaladores de macOS y Windows.
- Probar físicamente el instalador de Windows en un equipo Windows x64.
- Decidir cuándo migrar el appId y la carpeta de datos; no debe hacerse hasta
  disponer de una migración y un actualizador firmados.
- Revisar la licencia y distribución del binario de FFmpeg incluido.
