# Traspaso de ScoutAnalyzer 0.6.1

Última actualización: 27 de julio de 2026

## Resultado de esta versión

ScoutAnalyzer incorpora un catálogo inicial utilizable de Primera División
Masculina GESA FBRM 2026/27:

- 16 equipos incluidos en el calendario oficial;
- códigos estables y referencias de club FBRM;
- ciudades, municipios, pabellones, patrocinadores, colores de trabajo y
  enlaces de procedencia;
- ocho partidos de la primera jornada;
- siete escudos obtenidos de fuentes oficiales;
- nueve identidades visuales provisionales claramente identificadas;
- doce jugadores ficticios por equipo, 192 en total, marcados como `DEMO`.

La aplicación instala y actualiza este catálogo automáticamente. La operación
es repetible y no elimina equipos, análisis o acciones del usuario.

## Criterio de calidad

Los equipos, emparejamientos, fechas y sedes proceden del calendario público de
la FBRM. Los datos adicionales solo se incorporan cuando existe una fuente
federativa o del propio club.

Las plantillas oficiales 2026/27 no estaban publicadas al cerrar esta versión.
Por eso no se han inventado identidades que pudieran confundirse con personas
reales. Las fichas `DEMO` emplean dorsales, posiciones y alturas simuladas, sin
fecha de nacimiento ni datos de contacto.

Antes de distribuir comercialmente la aplicación deben obtenerse los permisos
necesarios para usar marcas y escudos de terceros. La documentación completa de
procedencia está en `docs/CATALOGO-FBRM-2026-27.md`.

## Integración

- `electron/catalogs/fbrm-2026-27.cjs`: catálogo versionado, calendario y
  generación determinista de plantillas `DEMO`.
- `electron/catalogs/assets`: siete imágenes oficiales disponibles sin
  conexión.
- `electron/database.cjs`: instalación automática, actualización idempotente,
  trazabilidad y limpieza segura de los dos equipos vacíos iniciales.
- `src/components/DatabaseLibrary.jsx`: estados `FBRM` y `DEMO`, fichas de
  equipos y resumen administrativo.
- `src/App.jsx`: un análisis nuevo y vacío ya no se registra como histórico.
- `test/fbrm-catalog.test.js`: integridad del catálogo y de su instalación.

## Verificación

- 35 pruebas automáticas superadas.
- Catálogo comprobado con 16 equipos únicos, 192 jugadores `DEMO` y ocho
  partidos.
- Instalación repetida del catálogo sin duplicados.
- Base SQLite comprobada dentro de Electron:
  `DATABASE_OK version=1 teams=2 players=1 matches=1 events=1 privacy=private`.
- Renderizado independiente de los seis paneles principales.
- Prueba multimedia real:
  `VIDEO_SEEK_OK duration=12.00 seek=7.25 playback=8.46 rate=2x ranges=1`.
- Compilación Vite de producción superada.
- Revisión visual de Partidos, Equipos, Jugadores y Administración superada.
- Paquetes macOS Apple Silicon y Windows x64 generados.
- Instalador Windows comprobado estructuralmente; continúa pendiente la prueba
  física en Windows.

## Paquetes 0.6.1

```text
ScoutAnalyzer-0.6.1-mac-arm64.dmg
ScoutAnalyzer-0.6.1-win-x64.exe
ScoutAnalyzer-0.6.1-win-x64.zip
```

Huellas SHA-256:

```text
7b2b3b9208606bd584c98c4cf74fc408a583666c6de1c87f7fc3b43fb36ed2d7  ScoutAnalyzer-0.6.1-mac-arm64.dmg
46faf83dda2811138ae91e20d727cc7424eebece6c0ee03a8eabcf75b6d13f29  ScoutAnalyzer-0.6.1-win-x64.exe
20a7c639a8da2d28ce85d53ddf8286fe8352450516dea39ebb3d7f9640220085  ScoutAnalyzer-0.6.1-win-x64.zip
```

## Siguiente fase recomendada

1. Solicitar a la FBRM o a los clubes un canal autorizado para plantillas,
   resultados y escudos.
2. Sustituir gradualmente los jugadores `DEMO` conservando sus relaciones.
3. Crear el proyecto Supabase y activar el catálogo compartido.
4. Añadir actualización administrativa del catálogo con control de versiones.
5. Probar físicamente la versión Windows x64.
