@echo off
setlocal enabledelayedexpansion

set "JDK_BIN=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\bin"
if exist "%JDK_BIN%\java.exe" (
    set "PATH=%JDK_BIN%;%PATH%"
)

cd /d "%~dp0"

call compile.bat
if %ERRORLEVEL% neq 0 (
    echo Compilation failed. Aborting execution.
    exit /b 1
)

set "CP=target\classes;lib\*"
set "MODULE_PATH=lib"

echo Launching JavaFX Enterprise Application...
java --module-path "%MODULE_PATH%" --add-modules javafx.controls,javafx.graphics,javafx.base -cp "%CP%" com.psl.lawfirm.gui.LawFirmJavaFXApp
