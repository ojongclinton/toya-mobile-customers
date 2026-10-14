$ErrorActionPreference = "Stop"

# Run this script from anywhere; it always uses the folder containing the script.
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host "Building Toya customer Android release from $ProjectRoot" -ForegroundColor Cyan

# Local builds target staging. EAS profiles remain unchanged.
$env:EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = "1"
$env:EXPO_PUBLIC_BASE_URL = "https://staging-api.toya-vtc.com/api"
$env:EXPO_PUBLIC_WS_BASE_URL = "wss://staging-api.toya-vtc.com"

# Resolve Android SDK.
$Sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }
if (-not (Test-Path $Sdk)) {
  throw "Android SDK not found at '$Sdk'. Install/configure Android Studio first."
}
$env:ANDROID_HOME = $Sdk
$env:ANDROID_SDK_ROOT = $Sdk

# Gradle needs this machine-local file; do not commit it.
$LocalProperties = Join-Path $ProjectRoot "android\local.properties"
"sdk.dir=$($Sdk -replace '\\','/')" | Set-Content -Path $LocalProperties -Encoding ascii

# Native release builds in this project use the local debug signing config for testing.
$DebugKeystore = Join-Path $ProjectRoot "android\app\debug.keystore"
if (-not (Test-Path $DebugKeystore)) {
  $Keytool = Join-Path ${env:ProgramFiles} "Android\Android Studio\jbr\bin\keytool.exe"
  if (-not (Test-Path $Keytool)) {
    $Keytool = (Get-Command keytool -ErrorAction SilentlyContinue).Source
  }
  if (-not $Keytool) {
    throw "keytool.exe not found. Install Android Studio/JDK first."
  }

  & $Keytool -genkeypair -v -storetype JKS `
    -keystore $DebugKeystore -alias androiddebugkey -keyalg RSA -keysize 2048 `
    -validity 10000 -storepass android -keypass android `
    -dname "CN=Android Debug,O=Android,C=US"
  if ($LASTEXITCODE -ne 0) { throw "Could not create debug keystore." }
}

# Clear generated native outputs only. Gradle's global dependency cache is preserved.
$Generated = @(
  "android\.cxx",
  "android\app\.cxx",
  "android\build",
  "android\app\build"
)
foreach ($Path in $Generated) {
  $FullPath = Join-Path $ProjectRoot $Path
  if (Test-Path $FullPath) {
    Remove-Item -LiteralPath $FullPath -Recurse -Force
  }
}

$GradleExit = 0
Push-Location (Join-Path $ProjectRoot "android")
try {
  & ".\gradlew.bat" --stop | Out-Null
  & ".\gradlew.bat" app:assembleRelease -x lint -x lintVitalAnalyzeRelease -x test --configure-on-demand --build-cache "-Dorg.gradle.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=1g"
  $GradleExit = $LASTEXITCODE
} finally {
  Pop-Location
}
if ($GradleExit -ne 0) { throw "Android build failed." }

$Apk = Join-Path $ProjectRoot "android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $Apk) {
  Write-Host "`nBUILD SUCCESSFUL" -ForegroundColor Green
  Write-Host "APK: $Apk" -ForegroundColor Green
} else {
  throw "Build completed but APK was not found at $Apk"
}
