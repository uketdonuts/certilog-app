@echo off
REM Build APK script with versioning

SETLOCAL ENABLEDELAYEDEXPANSION
SET SCRIPT_DIR=%~dp0
IF "%SCRIPT_DIR:~-1%"=="\" SET SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

SET ANDROID_DIR=%SCRIPT_DIR%\..\apps\mobile\android
SET APP_BUILD_GRADLE=%ANDROID_DIR%\app\build.gradle
SET APP_JSON=%SCRIPT_DIR%\..\apps\mobile\app.json

echo Script dir: %SCRIPT_DIR%

REM Bump version
IF EXIST "%APP_BUILD_GRADLE%" (
    echo Updating version...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%\bump_version.ps1" "%APP_BUILD_GRADLE%"
)

REM Get version from app.json for APK naming
SET APP_VERSION=
FOR /F "tokens=*" %%i IN ('powershell -NoProfile -Command "(Get-Content '%APP_JSON%' | ConvertFrom-Json).expo.version"') DO SET APP_VERSION=%%i
echo Building version: %APP_VERSION%

REM Ensure JAVA_HOME is valid for Gradle
IF NOT "%JAVA_HOME%"=="" (
    IF NOT EXIST "%JAVA_HOME%\bin\java.exe" (
        echo WARNING: JAVA_HOME is set but invalid: %JAVA_HOME%
        SET JAVA_HOME=
    )
)

IF "%JAVA_HOME%"=="" (
    REM Try common JDK install locations (Adoptium / Oracle / others)
    FOR /D %%d IN ("C:\Program Files\Eclipse Adoptium\jdk-17*") DO SET JAVA_HOME=%%d
    IF "%JAVA_HOME%"=="" (
        FOR /D %%d IN ("C:\Program Files\Java\jdk-17*") DO SET JAVA_HOME=%%d
    )
)

IF "%JAVA_HOME%"=="" (
    echo ERROR: JAVA_HOME is not set and no JDK 17 was found.
    echo Please install JDK 17 and set JAVA_HOME accordingly.
    ENDLOCAL
    exit /b 4
)

echo Using JAVA_HOME: %JAVA_HOME%

REM Increase Node.js memory limit to prevent heap out of memory errors
set NODE_OPTIONS=--max-old-space-size=8192

REM Clear Metro/React Native cache
echo Clearing Metro bundler cache...
cd /d "%SCRIPT_DIR%\..\apps\mobile"
IF EXIST "node_modules\.cache" rmdir /s /q "node_modules\.cache" 2>nul
IF EXIST ".expo" rmdir /s /q ".expo" 2>nul

REM Run Gradle
IF NOT EXIST "%ANDROID_DIR%\gradlew.bat" (
    echo gradlew.bat not found
    ENDLOCAL
    exit /b 1
)

cd /d "%ANDROID_DIR%"

REM Clean build to ensure fresh compilation with latest code
echo Cleaning previous build...
call gradlew.bat clean

echo Running Gradle assembleRelease...
call gradlew.bat assembleRelease
IF ERRORLEVEL 1 (
    echo Gradle build failed
    ENDLOCAL
    exit /b 2
)

REM Locate APK
set APK_DIR=%ANDROID_DIR%\app\build\outputs\apk\release
set BUILT_APK=
for %%f in ("%APK_DIR%\*.apk") do set BUILT_APK=%%~f

IF "%BUILT_APK%"=="" (
    echo APK not found in %APK_DIR%
    ENDLOCAL
    exit /b 3
)

REM Destination
set DEST_DIR=%SCRIPT_DIR%\..\apps\dashboard\public\downloads
set HISTORY_DIR=%DEST_DIR%\history
IF NOT EXIST "%DEST_DIR%" mkdir "%DEST_DIR%"
IF NOT EXIST "%HISTORY_DIR%" mkdir "%HISTORY_DIR%"

REM Move all existing APKs to history folder before copying new one
echo Moving previous APK versions to history...
for %%f in ("%DEST_DIR%\*.apk") do (
    echo   Moving %%~nxf to history
    move "%%f" "%HISTORY_DIR%\" >nul 2>&1
)

REM Copy with versioned name
set VERSIONED_APK=certilog-v%APP_VERSION%.apk

echo Copying new APK...
copy "%BUILT_APK%" "%DEST_DIR%\%VERSIONED_APK%" /Y


REM Update dashboard version file
set VERSION_JSON=%SCRIPT_DIR%\..\apps\dashboard\public\app-version.json

REM Try to read Android versionCode as buildNumber (fallback to 0)
set BUILD_NUMBER=
FOR /F "tokens=*" %%i IN ('powershell -NoProfile -Command "$p='%APP_BUILD_GRADLE%'; if (Test-Path $p) { $m = (Get-Content $p -Raw | Select-String -Pattern 'versionCode\s+(\d+)' -AllMatches).Matches; if ($m.Count -gt 0) { $m[$m.Count-1].Groups[1].Value } }"') DO SET BUILD_NUMBER=%%i
IF "%BUILD_NUMBER%"=="" SET BUILD_NUMBER=0

powershell -NoProfile -Command "$obj = [ordered]@{ buildDate = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss'); version = '%APP_VERSION%'; buildNumber = [int]%BUILD_NUMBER% }; $obj | ConvertTo-Json | Set-Content -Encoding UTF8 '%VERSION_JSON%'"

echo.
echo ========================================
echo Build complete!
echo Version: %APP_VERSION%
echo APK: %DEST_DIR%\%VERSIONED_APK%
echo History: %HISTORY_DIR%
echo Version file: %VERSION_JSON%
echo ========================================

ENDLOCAL
exit /b 0
