# Plan de ejecución para Codex

Guía operativa para implementar Camtoyz Control sobre este scaffold. Trabaja **en orden**, en ramas por tarea, y deja `npm run typecheck` en verde en cada PR.

## Reglas permanentes
- **Diseño:** replica los frames de `design/reference/*.html`. Abre el HTML en el navegador como referencia visual.
- **Color/tipografía:** SOLO desde `src/theme`. Si falta un token, agrégalo ahí, no hardcodees.
- **BLE:** todo pasa por `src/ble/BleManager.ts`. No dispersar llamadas a la lib.
- **Rutas:** respeta `src/navigation/routes.ts` y `DESIGN_FRAME_MAP`. Al construir una pantalla, regístrala en `App.tsx`.
- **Estados:** cada pantalla con datos debe tener loading/empty/error.
- Confirma con el usuario antes de acciones irreversibles (publicar, borrar, credenciales).

## Tareas

### T1 · Levantar el proyecto en el teléfono (Fase 1) ✅
1. `npm install` → `npx expo install` para alinear nativos → `npx expo prebuild`.
2. `npm run android` con el Android físico conectado (depuración USB). Resuelve permisos.
3. Verifica navegación Splash→Dashboard y que los tokens se ven bien.
- **Entregable:** app instalada; captura de Splash y Dashboard reales.

### T2 · BleManager real (Fase 2) ✅
1. Implementa escaneo/conexión/MTU/reconexión en `BleManager` con react-native-ble-plx.
2. Crea `src/state/` (zustand) con estado de conexión/dispositivo/batería, alimentado por el `subscribe` del manager.
3. Construye pantalla `Scan` (02a/b/c) como bottom sheet con los 3 estados.
4. Overlays/estados 09a (reconectando, con botón), 09b (batería baja), 09c (error).
- **Entregable:** conectar el bullet físico, ver batería real, recuperación automática tras caída.

### T3 · Protocolo real (Fase 2, en paralelo con T2) ✅
- Sigue `docs/BLE_PROTOCOL.md`: captura los bytes con el hardware y fija `src/ble/protocol.ts` (rango de intensidad, opcodes de patrón, stop, característica de escritura, `withoutResponse`).
- **Entregable:** un patrón y una intensidad continua funcionando en el bullet.

### T4 · Vibración escalable (Fase 3)
- `PatternsAll` (03b) data-driven por categorías; `MultiDevice` (03c). Modelo de datos de patrones en `src/state`.
- **Entregable:** añadir patrón por datos sin tocar layout.

### T5 · Pad de gesto (Fase 4)
- `GestureControl` (04) con gesture-handler + reanimated; worklet que hace throttle y llama `setIntensity`. `GestureMultiDevice` (04b).
- **Entregable:** control fluido en tiempo real sin desconexión.

### T6 · Sonido y música (Fase 5)
- `SoundControl` (05): micrófono → nivel + curva de sensibilidad. `MusicControl` (06).
- **Entregable:** respuesta perceptiblemente afinable.

### T7 · Salas (Fase 6)
- `server/` Node+socket.io (membresía/roles). `src/features/room/RoomClient.ts` (WebRTC DataChannel + socket). Pantallas 07a–07g.
- Roles: anfitrión (expulsar/bloquear/terminar), miembro. Badge de privacidad.
- **Entregable:** control remoto entre 2 teléfonos vía sala + moderación.

### T8 · Pulido (Fase 7)
- Dark mode (10a/b/c), i18n ES, settings (08), accesibilidad AA, EAS build.

## Checklist por PR
- [ ] `npm run typecheck` limpio
- [ ] Pantalla fiel al frame de diseño
- [ ] Sin colores hardcodeados
- [ ] Estados loading/empty/error
- [ ] Probado en dispositivo físico cuando aplica BLE
