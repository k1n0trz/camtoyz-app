# Checkpoint — T6 sonido y música validado

Fecha: 2026-07-14

## Estado restaurable

- Rama: `codex/t6-audio`
- PR de trabajo: #5 (`feat: control por sonido y música seguro`)
- Hardware validado: Galaxy S22+ (`RFCTA1XCYQD`) y HyperBullet.
- El repositorio remoto es `https://github.com/k1n0trz/camtoyz-app`.

## Lo que funciona físicamente

- Escaneo, conexión BLE, patrones, intensidad y parada de seguridad.
- Control por gesto con parada al salir de la pantalla.
- Control por sonido con permiso de micrófono, activación en un toque y parada automática tras silencio.
- Perfiles de sonido calibrados para HyperBullet: Suave, Media y Alta.
- Control musical desde otra app, validado con Spotify mediante captura de audio interno.
- Control musical desde archivos guardados en el teléfono, con selección nativa y reproducción local.
- Deslizador de nivel máximo de vibración en lugar de botones de porcentaje.
- Detector musical validado con 15 de 16 golpes, intensidades variables y parada automática al terminar.

## Seguridad vigente

- Todo control pasa por `src/ble/BleManager.ts`.
- La salida de Control por sonido o musical, el botón Detener y el desenfoque ejecutan parada BLE.
- Los comandos musicales se serializan: cada pulso termina antes de permitir el siguiente.
- El silencio, la pausa y el final de una canción envían la parada BLE doble.
- No reactivar automáticamente un motor tras reconexión.

## Compatibilidad conocida

- La captura desde otra app depende de que esa aplicación permita a Android capturar su audio. Spotify quedó validado.
- Para aplicaciones que bloqueen la captura, usar la opción `Mi dispositivo` con un archivo local.

## Siguiente trabajo — T7

Iniciar salas remotas (Fase 6): servidor de membresía/roles y control entre dos teléfonos. La validación física completa requerirá un segundo teléfono.

## Restauración rápida

```powershell
git fetch origin
git switch codex/t6-audio
npm install
npm run typecheck
npm run android
```
