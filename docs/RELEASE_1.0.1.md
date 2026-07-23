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
- `versionCode`: `13`
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
- La instalación reporta `versionName 1.0.1`, `versionCode 13` y `targetSdk 35`.
- En el Galaxy se comprobó que el consentimiento inicia desmarcado, impide el ingreso y habilita el botón únicamente después de aceptarlo y completar los datos.
- Reglas de sala verificadas visualmente en el dispositivo.
- Copia nueva verificada en español e inglés.
- Salud del servidor público confirmada en `https://app.camtoyz.com/health`.

## Artefacto

- Archivo: `releases/Camtoyz-App-1.0.1-internal.apk`
- Tamaño: `119498194` bytes.
- SHA-256: `ABBA39218CA336EEA9D13F0DB5A96E237476C179B96C7AFFBBB64CEBFE90D95E`
- Certificado: firma interna de pruebas para permitir actualización sobre las versiones anteriores; no usar para Google Play.

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
