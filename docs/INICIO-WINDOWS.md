# Continuar Tactovia en Windows

## Primera instalación

1. Instala **GitHub Desktop** y **Node.js 24 LTS**.
2. En GitHub Desktop elige **File → Clone repository → URL**.
3. Usa `https://github.com/dariogea/tactovia.git` y elige una carpeta local.
4. Abre esa carpeta y ejecuta `INSTALAR-WINDOWS.bat` con doble clic.
5. Al terminar, ejecuta `INICIAR-WINDOWS.bat`.

La primera instalación descarga las dependencias y necesita Internet. Los vídeos,
análisis y perfiles no se descargan desde GitHub: deben copiarse o exportarse de
forma independiente si se quieren usar en ambos ordenadores.

## Uso diario

1. En GitHub Desktop pulsa **Fetch origin** y después **Pull origin** si aparece.
2. Ejecuta `INICIAR-WINDOWS.bat`.
3. Antes de cambiar de ordenador, cierra Tactovia, revisa los cambios y súbelos
   desde GitHub Desktop. No añadas vídeos, archivos `.scout.json` ni `.env`.

## Si el repositorio ya estaba clonado con el nombre anterior

GitHub redirige temporalmente la dirección antigua. Para dejarla corregida,
abre **Repository → Repository settings → Remote** en GitHub Desktop y usa:

`https://github.com/dariogea/tactovia.git`

## Webapp online

El acceso cloud todavía necesita un proyecto Supabase real. La aplicación se
ejecuta sin él mediante perfiles locales y la demo. No inventes ni publiques
valores en `.env.local`; ese archivo nunca debe subirse a GitHub.
