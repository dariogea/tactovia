# Traspaso Tactovia 0.11.0

## Resultado

La versión 0.11 convierte el prototipo con catálogo piloto en un producto local
orientado a los datos reales del usuario.

## Cambios

- acceso profesional con varios perfiles locales;
- almacenamiento y preferencias aislados por perfil;
- demo efímera únicamente en desarrollo;
- esquema SQLite 3 e histórico estadístico sin vídeo;
- catálogo FBRM de demostración, logos e importadores retirados;
- competiciones, equipos y plantillas creados por el usuario;
- plantillas rápidas de 5, 8, 10 y 12 jugadores;
- traspasos, agentes libres y dorsales en camisetas;
- nueva pista SVG por zonas;
- estadísticas configurables, PDF personalizado y Excel para Power BI;
- presets de clips;
- Playbook reorganizado;
- temas Arena, Océano y Grafito;
- guía de usuario integrada y documentada.

## Compatibilidad

La migración no elimina equipos o partidos que estén relacionados con análisis
reales. El nombre de base de datos, carpeta de usuario, extensión de proyecto y
bundle ID se mantienen para conservar los datos existentes.

## Verificación

- 40 pruebas unitarias e integradas.
- SQLite real en Electron: esquema 3 e histórico sin vídeo.
- Vídeo MP4 real: duración, salto, reproducción a ×2 y rangos.
- Compilación Vite de producción.
- Revisión visual de acceso, etiquetado, estadísticas, biblioteca, informes,
  guía y Playbook sin errores de consola.
- DMG verificado y EXE/ZIP comprobados estructuralmente.
