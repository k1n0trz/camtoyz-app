# Camtoyz App 1.0.1 - entrega interna Android

Fecha de preparación: 23 de julio de 2026.

## Alcance

- Confirmación obligatoria de mayoría de edad (18+) y consentimiento expreso antes de crear o unirse a cada sala.
- La aceptación inicia desmarcada y los botones de entrada permanecen inactivos hasta que la persona la confirme.
- Reglas de la sala, resumen de privacidad y correo `support.app@camtoyz.com` visibles antes y durante la sesión.
- El texto informa sobre video, audio, control remoto, retiro del consentimiento y prohibición de grabar o compartir sin autorización.
- Privacidad WebRTC descrita con precisión: conexión cifrada directa o mediante relevo TURN, sin función de grabación en la aplicación.
- Salida segura centralizada: abandonar o terminar una sala revoca el control, intenta detener el juguete y cierra cámara y micrófono antes de limpiar la sesión.
- Botones y gesto de retorno protegidos para evitar abandonar visualmente una sala sin ejecutar el cierre seguro.

## Identificación Android

- Versión: `1.0.1`
- `versionCode`: `14`
- Paquete: `com.camtoyz.app`
- Servidor: `https://app.camtoyz.com`
- Distribución: APK interna; no corresponde todavía a publicación en Google Play.

## Validación automatizada

- TypeScript sin errores.
- ESLint sin errores ni advertencias.
- Configuración release apuntando a `https://app.camtoyz.com`.
- Diez pruebas de integración del servidor aprobadas.
- APK release compilada correctamente, con firma interna v2 verificada.
- Instalación y arranque sin Metro confirmados en Galaxy S22+ (`SM-S906E`).
- La instalación reporta `versionName 1.0.1`, `versionCode 14` y `targetSdk 36`.
- Migración validada a Expo SDK 54, React Native 0.81 y arquitectura nueva de Android.
- Las 24 bibliotecas nativas ARM64 y sus 73 segmentos de carga cumplen alineación de 16 KB.
- El APK permanece abierto en el Galaxy y no registra errores fatales tras corregir la compatibilidad WebRTC.
- En el Galaxy se comprobó que el consentimiento inicia desmarcado, impide el ingreso y habilita el botón únicamente después de aceptarlo y completar los datos.
- Reglas de sala verificadas visualmente en el dispositivo.
- Copia nueva verificada en español e inglés.
- Salud del servidor público confirmada en `https://app.camtoyz.com/health`.

## Artefacto

- Archivo: `deliverables/Camtoyz-App-1.0.1-internal-api36.apk`
- Tamaño: `161571295` bytes.
- SHA-256: `E21909B3300E1147BDBDF764DB47AC9E31EEDE26EC0B7A67561BC576ADE18123`
- Certificado: firma interna de pruebas para permitir actualización sobre las versiones anteriores; no usar para Google Play.

## Entregables empresariales

- APK: `deliverables/Camtoyz-App-1.0.1-enterprise.apk`
- Tamaño APK: `161576747` bytes.
- SHA-256 APK: `D4C7AC1209E5E8FE6FF738C4FC1868576C49B26607861AB36F62E6B4F23D7FC3`
- AAB para Play Console: `deliverables/Camtoyz-App-1.0.1-play-upload.aab`
- Tamaño AAB: `99895260` bytes.
- SHA-256 AAB: `0D5781BF1914590FA3F1523CBDF7060D5B035D057520AEAEAD4DCD595F7D66D8`
- Certificado empresarial: `CN=Helti S.A.S., O=Helti S.A.S., C=CO`.
- SHA-256 del certificado: `20:CB:B9:94:BE:25:D8:87:95:B9:A6:E8:1A:E0:8E:C8:FE:96:66:8E:70:38:77:BF:E5:C4:19:59:26:EC:5D:B2`.
- APK y AAB firmados con la misma clave de carga. APK instalada y arrancada correctamente en el Galaxy S22+.

## Validación física requerida

- Crear y unir una sala desde dos teléfonos confirmando que la casilla inicia desmarcada.
- Verificar los textos y controles en español, inglés, tema claro y tema oscuro.
- Con un juguete conectado al anfitrión, iniciar vibración remota y comprobar que cada una de estas acciones la detiene:
  - revocar el control;
  - salir como invitado;
  - terminar la sala como anfitrión;
  - usar Atrás y confirmar la salida;
  - enviar la aplicación a segundo plano;
  - perder el canal remoto.
- Encender Duo Egg y confirmar nombre, imagen, conexión, canales y detención antes de declararlo validado físicamente.

## Pendientes documentales

- Firmas y revisión jurídica del protocolo.
- Verificación administrativa de Cloud Logging, Docker/Coturn y VPC Flow Logs.
