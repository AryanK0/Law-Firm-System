@echo off
setlocal enabledelayedexpansion

echo ===================================================================
echo Compiling Pearson Specter Litt Legal Platform (Java 21 LTS)
echo Enterprise Practice Management and REST Service Engine
echo ===================================================================

cd /d "%~dp0"

if not exist "storage\exports" mkdir "storage\exports"
if not exist "storage\snapshots" mkdir "storage\snapshots"
if not exist "storage\s3_vault" mkdir "storage\s3_vault"
if not exist "logs" mkdir "logs"
if not exist "target\classes" mkdir "target\classes"

:: Prioritize verified Adoptium JDK 21 installation or clean JAVA_HOME
if exist "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\bin\javac.exe" (
    set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
)
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"

where javac >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo [ERROR] javac compiler not found. Ensure Java 21 JDK is installed and JAVA_HOME is set.
    exit /b 1
)

for /f "tokens=2" %%v in ('javac -version 2^>^&1') do set "JAVA_VERSION=%%v"
echo [INFO] Detected Java Compiler Version: %JAVA_VERSION%

where mvn >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo [INFO] Building with Apache Maven...
    call mvn -q clean compile
    set "COMPILE_STATUS=!ERRORLEVEL!"
) else (
    echo [INFO] Compiling directly with JDK 21 javac and bundled libraries...
    javac -cp "lib\*" -d target\classes ^
        src\main\java\com\psl\lawfirm\model\*.java ^
        src\main\java\com\psl\lawfirm\exception\*.java ^
        src\main\java\com\psl\lawfirm\config\*.java ^
        src\main\java\com\psl\lawfirm\util\*.java ^
        src\main\java\com\psl\lawfirm\dao\*.java ^
        src\main\java\com\psl\lawfirm\service\*.java ^
        src\main\java\com\psl\lawfirm\api\*.java ^
        src\main\java\com\psl\lawfirm\gui\*.java ^
        src\main\java\com\psl\lawfirm\EnterpriseSystemRunner.java
    set "COMPILE_STATUS=!ERRORLEVEL!"
    if exist "src\main\resources" (
        xcopy /s /y /q "src\main\resources\*" "target\classes\" >nul 2>&1
    )
)

if !COMPILE_STATUS! equ 0 (
    echo [SUCCESS] Java 21 LTS Enterprise backend compiled successfully!
) else (
    echo [ERROR] Compilation failed with status !COMPILE_STATUS!.
)

exit /b !COMPILE_STATUS!
