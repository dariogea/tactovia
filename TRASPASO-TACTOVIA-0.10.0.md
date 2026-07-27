# Traspaso de Tactovia 0.10.0

Fecha: 28 de julio de 2026

## Resultado

ScoutAnalyzer pasa a denominarse públicamente **Tactovia**. La integración
incluye interfaz, acceso, introducción, navegación, “Acerca de”, informes,
libros Excel, favicon, iconos, metadatos e instaladores.

La identidad utiliza:

- Game Ink `#0B1218`;
- Strategic Teal `#08756D`;
- Signal Lime `#BDEB62`;
- Analysis White `#F4F7F5`;
- Slate `#64717C`.

Los originales de `tactovia-logo-system/` siguen siendo las fuentes maestras y
no se han modificado. Las copias necesarias viven en `public/brand` y
`build/icons`.

## Compatibilidad

Se mantienen de forma deliberada:

- paquete técnico `scout-analyzer`;
- bundle y app ID `com.scoutanalyzer.desktop`;
- carpeta de usuario `scout-analyzer`;
- base de datos `scoutanalyzer.db`;
- claves `scout-analyzer-*`;
- protocolo `scout-media`;
- proyectos `.scout.json`.

Electron fija la carpeta histórica antes de aplicar el nombre público Tactovia.
Esto evita que perfiles, preferencias, autoguardado, sesiones y base local
aparezcan vacíos tras actualizar.

La base real se verificó sobre una copia SQLite consistente: esquema 2, 20
equipos, 193 jugadores, 13 partidos, seis análisis y 48 eventos reconocidos.

## Validación

- 45 pruebas automáticas.
- Diez paneles y flujos renderizados de forma aislada.
- Compilación Vite de producción.
- Prueba de base de datos dentro de Electron.
- Prueba real de vídeo: duración 12 s, salto a 7,25 s, reproducción y ×2.
- Revisión visual clara y oscura a 1280 y 1024 px.
- Revisión de favicon 16/32, PNG, ICO e ICNS.
- DMG validado con `hdiutil verify` e inspección de `Info.plist`.
- EXE y ZIP de Windows generados e inspeccionados estructuralmente.

## Entregables

- `release/Tactovia-0.10.0-mac-arm64.dmg`
- `release/Tactovia-0.10.0-win-x64.exe`
- `release/Tactovia-0.10.0-win-x64.zip`

El empaquetado elimina carpetas intermedias, `blockmap` y versiones anteriores,
por lo que `release` conserva únicamente estos tres archivos.

## Pendientes

- Probar físicamente el instalador en Windows x64.
- Firmar y notarizar ambos instaladores.
- Validar legalmente el nombre y el símbolo.
- Revisar la licencia de redistribución de FFmpeg.
- Mantener el app ID y la ruta histórica hasta disponer de una migración y un
  actualizador firmados.

El detalle completo de recursos, tokens y decisiones está en
`BRAND_IMPLEMENTATION.md`.
