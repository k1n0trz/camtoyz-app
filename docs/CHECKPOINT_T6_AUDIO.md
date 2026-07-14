# Checkpoint — T6 audio validado

Fecha: 2026-07-14

## Estado restaurable

- Rama: `codex/t6-audio`
- PR de trabajo: #5 (`feat: control por sonido seguro`)
- Hardware validado: Galaxy S22+ (`RFCTA1XCYQD`) y HyperBullet.
- El repositorio remoto es `https://github.com/k1n0trz/camtoyz-app`.

## Lo que funciona físicamente

- Escaneo, conexión BLE, patrones, intensidad y parada de seguridad.
- Control por gesto con parada al salir de la pantalla.
- Control por sonido con permiso de micrófono, activación en un toque y parada automática tras silencio.
- Perfiles de sonido calibrados para HyperBullet: Suave, Media y Alta.

## Seguridad vigente

- Todo control pasa por `src/ble/BleManager.ts`.
- La salida de Control por sonido, el botón Detener y el desenfoque ejecutan parada BLE.
- No reactivar automáticamente un motor tras reconexión.

## Siguiente trabajo

Completar `MusicControl` (frame 06) como la segunda parte de T6. Debe mantener la misma parada de seguridad antes de cualquier validación física.

## Restauración rápida

```powershell
git fetch origin
git switch codex/t6-audio
npm install
npm run typecheck
npm run android
```
