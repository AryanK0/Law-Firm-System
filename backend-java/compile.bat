@echo off
setlocal enabledelayedexpansion

echo ===================================================================
echo Compiling Pearson Specter Litt Legal Backend (Java 25 LTS)
echo Enterprise Legal Operations Engine
echo ===================================================================

cd /d "%~dp0"

if not exist "storage\exports" mkdir "storage\exports"
if not exist "storage\snapshots" mkdir "storage\snapshots"
if not exist "storage\s3_vault" mkdir "storage\s3_vault"
if not exist "logs" mkdir "logs"

if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"
for /f "tokens=2" %%v in ('javac -version 2^>^&1') do set "JAVA_VERSION=%%v"
if not "%JAVA_VERSION:~0,2%"=="25" (
    echo [ERROR] Java 25 JDK is required. Set JAVA_HOME or PATH to a Java 25 JDK.
    exit /b 1
)

echo Compiling production and test sources with Maven...
mvn -q clean test-compile dependency:copy-dependencies -DoutputDirectory=target/dependency
set COMPILE_STATUS=%ERRORLEVEL%
if %COMPILE_STATUS% equ 0 (
    echo [SUCCESS] Production and test compilation completed.
) else (
    echo [ERROR] Compilation failed with status %COMPILE_STATUS%.
)

exit /b %COMPILE_STATUS%
