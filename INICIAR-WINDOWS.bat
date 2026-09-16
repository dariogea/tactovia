@echo off
setlocal
cd /d "%~dp0"
title Tactovia

if not exist "node_modules" (
  echo Primero ejecuta INSTALAR-WINDOWS.bat.
  pause
  exit /b 1
)

call pnpm dev
if errorlevel 1 (
  echo.
  echo Tactovia se ha cerrado con un error. Comprueba que Node.js 24 y pnpm estan instalados.
  pause
)
