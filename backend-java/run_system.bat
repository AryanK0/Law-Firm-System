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
echo Running Pearson Specter Litt Enterprise Diagnostic Verification...
echo 5-Module Integrity and Health Suite (Java 21 LTS + MySQL 8.3)
echo ===================================================================
"!JAVA_BIN!" -cp "%CP%" com.psl.lawfirm.EnterpriseSystemRunner
