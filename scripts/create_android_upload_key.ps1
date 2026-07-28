$ErrorActionPreference = 'Stop'

$destination = Join-Path $env:USERPROFILE 'Documents\Camtoyz-Signing'
$keystore = Join-Path $destination 'camtoyz-upload.p12'
$certificate = Join-Path $destination 'camtoyz-upload-certificate.pem'
$fingerprint = Join-Path $destination 'camtoyz-upload-fingerprint.txt'
$alias = 'camtoyz-upload'
$distinguishedName = 'CN=Helti S.A.S., O=Helti S.A.S., C=CO'

if (Test-Path -LiteralPath $keystore) {
    throw "Ya existe un almacén de firma en $keystore. No se sobrescribió."
}

$keytoolCommand = Get-Command keytool.exe -ErrorAction SilentlyContinue
if (-not $keytoolCommand) {
    $javaHomeKeytool = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
    if (-not (Test-Path -LiteralPath $javaHomeKeytool)) {
        throw 'No se encontró keytool.exe. Instala o configura el JDK antes de continuar.'
    }
    $keytool = $javaHomeKeytool
} else {
    $keytool = $keytoolCommand.Source
}

New-Item -ItemType Directory -Path $destination -Force | Out-Null

Write-Host 'El custodio debe introducir una contraseña fuerte y guardarla en su gestor empresarial.'
$securePassword = Read-Host 'Contraseña de la clave de carga' -AsSecureString
$confirmation = Read-Host 'Repita la contraseña' -AsSecureString

$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$confirmationPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmation)

try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $plainConfirmation = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmationPointer)

    if ($plainPassword -ne $plainConfirmation) {
        throw 'Las contraseñas no coinciden.'
    }
    if ($plainPassword.Length -lt 16) {
        throw 'La contraseña debe tener al menos 16 caracteres.'
    }

    $env:CAMTOYZ_TEMP_KEY_PASSWORD = $plainPassword

    & $keytool -genkeypair `
        -keystore $keystore `
        -storetype PKCS12 `
        -alias $alias `
        -keyalg RSA `
        -keysize 4096 `
        -validity 10000 `
        -dname $distinguishedName `
        -storepass:env CAMTOYZ_TEMP_KEY_PASSWORD `
        -keypass:env CAMTOYZ_TEMP_KEY_PASSWORD

    if ($LASTEXITCODE -ne 0) {
        throw 'keytool no pudo generar la clave de carga.'
    }

    & $keytool -exportcert -rfc `
        -keystore $keystore `
        -storetype PKCS12 `
        -alias $alias `
        -storepass:env CAMTOYZ_TEMP_KEY_PASSWORD `
        -file $certificate

    & $keytool -list -v `
        -keystore $keystore `
        -storetype PKCS12 `
        -alias $alias `
        -storepass:env CAMTOYZ_TEMP_KEY_PASSWORD |
        Select-String 'Alias name:|Nombre de alias:|SHA1:|SHA256:|Valid from:|Válido desde:' |
        Set-Content -LiteralPath $fingerprint -Encoding UTF8

    & icacls $destination /inheritance:r /grant:r "${env:USERNAME}:(OI)(CI)F" 'SYSTEM:(OI)(CI)F' | Out-Null

    Write-Host ''
    Write-Host "Clave privada creada en: $keystore"
    Write-Host "Certificado público: $certificate"
    Write-Host "Huellas del certificado: $fingerprint"
    Write-Host 'El custodio debe crear ahora una copia externa cifrada.'
} finally {
    Remove-Item Env:\CAMTOYZ_TEMP_KEY_PASSWORD -ErrorAction SilentlyContinue
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    if ($confirmationPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmationPointer)
    }
    $plainPassword = $null
    $plainConfirmation = $null
}
