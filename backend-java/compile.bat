@echo off
setlocal enabledelayedexpansion

echo ===================================================================
echo Compiling Pearson Specter Litt Legal Backend (Java 21 LTS)
echo Enterprise Legal Operations Engine
echo ===================================================================

set "JDK_BIN=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\bin"
if not exist "%JDK_BIN%\javac.exe" (
    set "JDK_BIN=javac"
) else (
    set "PATH=%JDK_BIN%;%PATH%"
)

cd /d "%~dp0"

if not exist "target\classes" mkdir "target\classes"
if not exist "storage\exports" mkdir "storage\exports"
if not exist "storage\snapshots" mkdir "storage\snapshots"
if not exist "storage\s3_vault" mkdir "storage\s3_vault"
if not exist "logs" mkdir "logs"

REM Copy resources to target\classes
xcopy /Y /S /I "src\main\resources\*" "target\classes\" >nul 2>&1

set "CP=lib\*;target\classes"

REM Gather all java source files
dir /s /b "src\main\java\*.java" > sources.txt

echo Compiling Java source files...
javac -cp "%CP%" -d "target\classes" -encoding UTF-8 @sources.txt
set COMPILE_STATUS=%ERRORLEVEL%
del sources.txt

if %COMPILE_STATUS% equ 0 (
    echo [SUCCESS] Compilation completed without errors.
) else (
    echo [ERROR] Compilation failed with status %COMPILE_STATUS%.
)

exit /b %COMPILE_STATUS%
