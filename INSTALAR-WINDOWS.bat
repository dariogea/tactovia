@echo off
setlocal
cd /d "%~dp0"
title Preparar Tactovia

where node >nul 2>nul
if errorlevel 1 (
  echo No se ha encontrado Node.js.
  echo Instala Node.js 24 LTS desde https://nodejs.org/ y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node"') do set "TACTOVIA_NODE_MAJOR=%%V"
if %TACTOVIA_NODE_MAJOR% LSS 22 (
  echo Tactovia necesita Node.js 22 o posterior. Se recomienda Node.js 24 LTS.
  pause
  exit /b 1
)

call corepack enable
if errorlevel 1 goto :error
call corepack prepare pnpm@9.12.3 --activate
if errorlevel 1 goto :error
call pnpm install --frozen-lockfile
if errorlevel 1 goto :error

echo.
echo Tactovia esta preparada. A partir de ahora usa INICIAR-WINDOWS.bat.
pause
exit /b 0

:error
echo.
echo No se pudo completar la instalacion. Revisa tu conexion y vuelve a intentarlo.
pause
exit /b 1
