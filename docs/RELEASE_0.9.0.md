# Camtoyz App 0.9.0 — candidata interna

## Alcance congelado

- Plataforma: Android.
- Distribución: APK interna, sin Play Store.
- Salas: máximo dos participantes.
- Dispositivos: Intense, FlexiCurve, FlexRing y Whisper validados físicamente; HyperBullet se conserva como equipo de regresión.
- Multi-dispositivo: admite conectar dos juguetes, con control activo de uno a la vez.
- Backend: `https://app.camtoyz.com`.
- Infraestructura: VM verificada y acceso administrativo endurecido mediante IAP.
- Seguridad en sala: consentimiento explícito, revocación y parada inmediata en panel y cámara.
- Configuración: pantalla de Ajustes con versión, permisos y estado de documentación.

## Puertas para promover a 1.0.0

- Completar nombre legal, correo de soporte, política de privacidad, términos y textos de consentimiento.
- Aprobar una regresión final de BLE, sonido, música, gesto, sala, video y parada en los teléfonos de prueba.
- Verificar instalación limpia de la APK firmada y actualización desde 0.3.0.
- Confirmar que una pérdida de Bluetooth, red o sala nunca deja el motor vibrando.
- Archivar checksum, APK, commit y notas de la versión aprobada.

## Artefacto generado

- Archivo: `releases/Camtoyz-App-0.9.0-internal.apk` (ignorado por Git).
- Tamaño: 139.361.509 bytes.
- SHA-256: `D6F6D6B880FABE2659A0E2FC010A1A8B7E7C40194208C643E3A8655ABC3FF649`.
- Paquete: `com.camtoyz.app`.
- Versión: `0.9.0` / `versionCode 9`.
- Firma: certificado interno de pruebas, idéntico al usado en la instalación 0.3.0 del Galaxy.
- Validación: actualización `adb install -r` exitosa, proceso iniciado sin Metro y sin excepción fatal en logcat.

## Decisiones diferidas

- iOS.
- Play Store/AAB.
- Control simultáneo de más de un juguete.
- Salas de más de dos participantes.

## Deuda técnica aceptada para la candidata

- Expo Doctor mantiene dos advertencias conocidas: el proyecto conserva Android nativo por sus módulos propios, y `expo-av`/WebRTC requieren una migración controlada en lugar de una actualización forzada.
- Android se mantiene temporalmente en `targetSdkVersion 34` porque la distribución es interna; se actualizará y regresionará antes de reactivar Play Store.
- La APK interna conserva el certificado de pruebas existente para permitir actualización sobre 0.3.0. No es una clave de publicación.
