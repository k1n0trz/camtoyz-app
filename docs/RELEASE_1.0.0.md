# Camtoyz App 1.0.0 — entrega interna Android

Fecha de compilación: 21 de julio de 2026.

## Alcance

- APK universal para pruebas internas; no corresponde todavía a una publicación en Play Store.
- Botón principal `Unirse a una sala` para participantes sin juguete.
- Imagen comercial de Duo Egg asociada al identificador BLE `LY396A`.
- Calidad de señal Bluetooth representada con barras y texto comprensible, sin exponer RSSI/dBm.
- Arquitectura clásica de React Native para mantener compatibilidad estable con WebRTC y BLE.
- Pantalla de recuperación ante errores de render y fondo nativo de arranque para evitar pantallas vacías.
- Android `targetSdkVersion 35`, `versionCode 12` y `versionName 1.0.0`.

## Artefacto

- Archivo: `releases/Camtoyz-App-1.0.0-internal.apk`
- SHA-256: `6D39449845D5547104F6949EC9D61F6638AEA4E6248D7AAA708C8D9B685E0FC7`
- Firma: certificado interno de pruebas compatible con las versiones 0.9.x instaladas.

La firma interna permite actualizar directamente la aplicación de pruebas. No debe utilizarse como firma de publicación en Play Store.

## Validación completada

- TypeScript y ESLint sin errores.
- Configuración release apuntando a `https://app.camtoyz.com`.
- Servidor público saludable y 10 pruebas de integración aprobadas.
- APK alineada y firma v2 verificada.
- Instalación como actualización sobre 0.9.2 en Galaxy S22+.
- Ocho arranques en frío consecutivos con inicio y versión visibles, sin crash, ANR ni pantalla de recuperación.
- Navegación desde `Unirse a una sala` y regreso a inicio verificados.
- Escaneo Bluetooth abre correctamente; la imagen Duo Egg está incluida en el bundle.

## Pruebas manuales recomendadas

- Encender un Duo Egg y confirmar en el Galaxy su imagen, nombre y barras de señal durante el escaneo.
- Instalar el APK por el canal real de distribución en los demás teléfonos y repetir detección/conexión.
- Ejecutar la matriz final de sala y cámara con dos teléfonos en redes distintas antes de considerar aprobada la entrega interna.
