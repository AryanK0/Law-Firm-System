@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

if exist "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\bin\java.exe" (
    set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
)
if defined JAVA_HOME (
    set "PATH=%JAVA_HOME%\bin;%PATH%"
    set "JAVA_BIN=%JAVA_HOME%\bin\java.exe"
) else (
    set "JAVA_BIN=java"
)

call compile.bat
if !ERRORLEVEL! neq 0 (
    echo Compilation failed. Aborting execution.
    exit /b 1
)

set "CP=target\classes;lib\*"

echo ===================================================================
echo Starting Pearson Specter Litt Java REST Server (Port 8085)...
echo High-Throughput Legal Practice Core Engine Active
echo ===================================================================
"!JAVA_BIN!" -cp "%CP%" com.psl.lawfirm.api.JavaRestServer
