# Traspaso de ScoutAnalyzer 0.7.0

Última actualización: 27 de julio de 2026

## Resultado de esta versión

ScoutAnalyzer incorpora un sistema visual completo inspirado en aplicaciones
de productividad modernas, manteniendo la identidad deportiva y las funciones
de análisis:

- temas automático, claro y oscuro;
- detección y seguimiento en tiempo real del tema de Windows o macOS;
- preferencia guardada localmente;
- cabecera y navegación flotantes con transparencia controlada;
- botones, campos, tablas, tarjetas y modales unificados;
- modo claro real para todas las pestañas;
- modo oscuro con superficies grafito y jerarquía visible;
- Playbook adaptado para conservar el contraste en ambos temas;
- soporte para la preferencia de movimiento reducido.

## Implementación

- `src/lib/theme.js`: normalización y resolución del tema.
- `src/components/ThemeSelector.jsx`: selector compacto de la cabecera.
- `src/components/SettingsPanel.jsx`: selector visual detallado.
- `src/App.jsx`: persistencia, detección del sistema y actualización en vivo.
- `src/main.jsx`: aplicación temprana del tema para evitar parpadeos.
- `src/styles.css`: tokens visuales y adaptación de todos los componentes.
- `test/theme.test.js`: comportamiento automático y recuperación segura.
- `docs/SISTEMA-VISUAL-0.7.md`: criterios visuales y de accesibilidad.

## Verificación

- 37 pruebas automáticas superadas.
- Renderizado aislado de los seis paneles principales.
- Compilación Vite de producción superada.
- Revisión visual a 1280 píxeles sin desbordamiento horizontal.
- Etiquetado, Estadísticas, Biblioteca, Equipos y jugadores, Playbook, Informe y
  Ajustes revisados en modo claro.
- Etiquetado, Playbook y Ajustes revisados en modo oscuro.
- El modo automático coincide con la preferencia real del sistema.
- Prueba multimedia real superada.
- Base SQLite comprobada dentro de Electron.
- Paquetes macOS Apple Silicon y Windows x64 generados.
- Windows continúa pendiente de prueba física.

## Paquetes 0.7.0

```text
ScoutAnalyzer-0.7.0-mac-arm64.dmg
ScoutAnalyzer-0.7.0-win-x64.exe
ScoutAnalyzer-0.7.0-win-x64.zip
```

Huellas SHA-256:

```text
f812776d6ffb79778c7e8fc34c7ce79d1219cf595c1a59ac0b17368514ebbe69  ScoutAnalyzer-0.7.0-mac-arm64.dmg
4d6c3c1a95d688213a9da8e1eda4783243ecc2c924a2acf0de368f47f4030919  ScoutAnalyzer-0.7.0-win-x64.exe
4a5f50aa5d485a8b466b3a80faeec63f06ef31733de841067056327cbfbf8f72  ScoutAnalyzer-0.7.0-win-x64.zip
```
