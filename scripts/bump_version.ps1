# Bump version script for CertiLog
# Updates version in app.json and build.gradle

param(
    [string]$BuildGradle
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppJsonPath = Join-Path $ScriptDir "..\apps\mobile\app.json"

if (-not (Test-Path $AppJsonPath)) {
    Write-Host "app.json not found at $AppJsonPath"
    exit 1
}

# Read app.json
$AppJson = Get-Content $AppJsonPath -Raw | ConvertFrom-Json
$CurrentVersion = $AppJson.expo.version

# Parse version
$VersionParts = $CurrentVersion -split '\.'
$Major = [int]$VersionParts[0]
$Minor = [int]$VersionParts[1]
$Patch = [int]$VersionParts[2]

# Bump patch version
$Patch++
$NewVersion = "$Major.$Minor.$Patch"

Write-Host "Bumping version: $CurrentVersion -> $NewVersion"

# Update app.json (without BOM)
$AppJson.expo.version = $NewVersion
$JsonContent = $AppJson | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($AppJsonPath, $JsonContent)
Write-Host "Updated app.json"

# Update build.gradle if provided
if ($BuildGradle -and (Test-Path $BuildGradle)) {
    $GradleContent = Get-Content $BuildGradle -Raw

    # Update versionName
    $GradleContent = $GradleContent -replace 'versionName\s+"[\d.]+"', "versionName `"$NewVersion`""

    # Update versionCode (increment)
    if ($GradleContent -match 'versionCode\s+(\d+)') {
        $OldVersionCode = [int]$Matches[1]
        $NewVersionCode = $OldVersionCode + 1
        $GradleContent = $GradleContent -replace 'versionCode\s+\d+', "versionCode $NewVersionCode"
        Write-Host "Updated versionCode: $OldVersionCode -> $NewVersionCode"
    }

    # Save without BOM (Gradle can't read BOM)
    [System.IO.File]::WriteAllText($BuildGradle, $GradleContent)
    Write-Host "Updated build.gradle"
}

# Create version.json for dashboard
$DashboardPublicDir = Join-Path $ScriptDir "..\apps\dashboard\public"
if (-not (Test-Path $DashboardPublicDir)) {
    New-Item -ItemType Directory -Path $DashboardPublicDir -Force | Out-Null
}

$VersionInfo = @{
    version = $NewVersion
    buildDate = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    buildNumber = if ($NewVersionCode) { $NewVersionCode } else { 1 }
}

$VersionJsonPath = Join-Path $DashboardPublicDir "app-version.json"
$VersionInfo | ConvertTo-Json | Set-Content $VersionJsonPath -Encoding UTF8
Write-Host "Created version.json at $VersionJsonPath"

Write-Host "Version bump complete: $NewVersion"
