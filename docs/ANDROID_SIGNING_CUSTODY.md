# Firma Android de Camtoyz App

## Responsabilidades

- **Custodio empresarial:** crea y conserva las contraseñas, guarda la copia de respaldo
  fuera de este computador y administra Play Console y Play App Signing.
- **Equipo técnico:** genera el almacén de clave de carga, deja una copia local protegida,
  configura la compilación y entrega el APK/AAB para su validación o publicación.

## Ubicación local

La copia local privada se conserva fuera del repositorio en:

`C:\Users\trafficker.digital\Documents\Camtoyz-Signing\camtoyz-upload.p12`

El repositorio ignora archivos `.jks`, `.keystore` y `.p12`. La contraseña nunca debe
guardarse en Git, documentos, capturas, chats ni archivos de configuración.

## Generación

Ejecutar `scripts/create_android_upload_key.ps1` con el custodio presente. El custodio
introduce y conserva la contraseña; el script no la escribe en disco.

La clave generada es una **clave de carga**. Al crear la aplicación en Google Play,
el custodio debe activar **Play App Signing**. Google custodiará la clave de firma de
la aplicación y esta clave local se usará para autenticar futuras cargas.

## Compilación firmada

En una sesión temporal de PowerShell se definen:

- `CAMTOYZ_UPLOAD_STORE_FILE`
- `CAMTOYZ_UPLOAD_STORE_PASSWORD`
- `CAMTOYZ_UPLOAD_KEY_ALIAS`
- `CAMTOYZ_UPLOAD_KEY_PASSWORD`

Gradle rechaza una configuración parcial. Después de compilar se deben borrar las
variables de la sesión y verificar el certificado del APK/AAB.

## Copias mínimas

1. Copia local protegida en este computador.
2. Copia externa cifrada bajo custodia empresarial.
3. Contraseña almacenada por el custodio en un gestor de contraseñas empresarial,
   separada de ambas copias.
