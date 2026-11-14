@echo off
setlocal enabledelayedexpansion

if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"

cd /d "%~dp0"

call compile.bat
if %ERRORLEVEL% neq 0 (
    echo Compilation failed. Aborting execution.
    exit /b 1
)

set "CP=target\classes;target\dependency\*"

echo Starting Pearson Specter Litt Java REST Server on port 8085...
java -cp "%CP%" com.psl.lawfirm.api.JavaRestServer
