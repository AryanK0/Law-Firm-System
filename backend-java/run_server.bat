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

echo Starting Pearson Specter Litt Java REST Server on port 8085...
java -cp "%CP%" com.psl.lawfirm.api.JavaRestServer
