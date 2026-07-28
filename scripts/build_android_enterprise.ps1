$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$keystore = Join-Path $env:USERPROFILE 'Documents\Camtoyz-Signing\camtoyz-upload.p12'
$statusFile = Join-Path $projectRoot 'tmp\enterprise-signing-build-status.txt'
$apkSource = Join-Path $projectRoot 'android\app\build\outputs\apk\release\app-release.apk'
$aabSource = Join-Path $projectRoot 'android\app\build\outputs\bundle\release\app-release.aab'
$deliverables = Join-Path $projectRoot 'deliverables'

if (-not (Test-Path -LiteralPath $keystore)) {
    throw "No se encontró la clave de carga en $keystore"
}

Write-Host 'Introduce la contraseña definida para la clave empresarial.'
$securePassword = Read-Host 'Contraseña de la clave de carga' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $env:CAMTOYZ_UPLOAD_STORE_FILE = $keystore
    $env:CAMTOYZ_UPLOAD_STORE_PASSWORD = $plainPassword
    $env:CAMTOYZ_UPLOAD_KEY_ALIAS = 'camtoyz-upload'
    $env:CAMTOYZ_UPLOAD_KEY_PASSWORD = $plainPassword
    $env:NODE_ENV = 'production'

    New-Item -ItemType Directory -Path (Split-Path -Parent $statusFile) -Force | Out-Null
    New-Item -ItemType Directory -Path $deliverables -Force | Out-Null

    Push-Location (Join-Path $projectRoot 'android')
    try {
        & .\gradlew.bat :app:assembleRelease :app:bundleRelease --no-daemon
        if ($LASTEXITCODE -ne 0) {
            throw 'La compilación firmada no terminó correctamente. Comprueba la contraseña.'
        }
    } finally {
        Pop-Location
    }

    Copy-Item -LiteralPath $apkSource `
        -Destination (Join-Path $deliverables 'Camtoyz-App-1.0.1-enterprise.apk') -Force
    Copy-Item -LiteralPath $aabSource `
        -Destination (Join-Path $deliverables 'Camtoyz-App-1.0.1-play-upload.aab') -Force

    "SUCCESS $(Get-Date -Format o)" | Set-Content -LiteralPath $statusFile -Encoding UTF8
    Write-Host ''
    Write-Host 'Compilación empresarial completada correctamente.'
    Write-Host 'Puedes cerrar esta ventana.'
} catch {
    "FAILED $(Get-Date -Format o) $($_.Exception.Message)" |
        Set-Content -LiteralPath $statusFile -Encoding UTF8
    throw
} finally {
    Remove-Item Env:\CAMTOYZ_UPLOAD_STORE_FILE -ErrorAction SilentlyContinue
    Remove-Item Env:\CAMTOYZ_UPLOAD_STORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:\CAMTOYZ_UPLOAD_KEY_ALIAS -ErrorAction SilentlyContinue
    Remove-Item Env:\CAMTOYZ_UPLOAD_KEY_PASSWORD -ErrorAction SilentlyContinue
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    $plainPassword = $null
}
