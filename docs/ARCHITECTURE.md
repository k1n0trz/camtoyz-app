# Arquitectura — Camtoyz Control

## 1. App cliente (React Native + TS / Expo dev-client)

```
UI (screens/) ──▶ hooks/state (zustand) ──▶ BleManager (singleton)
                          │                        │
                          │                        └─▶ react-native-ble-plx ─▶ dispositivo
                          └─▶ RoomClient (Fase 6) ─▶ WebRTC DataChannel (control P2P)
                                                   └─▶ socket.io (control plane de sala)
```

- **BleManager** (`src/ble/BleManager.ts`): singleton. Mantiene UNA sesión BLE para toda la app (no abrir/cerrar por pantalla como hacía OmniRemote). Responsable de: escaneo, conexión, negociación de MTU, **auto-reconexión con backoff**, escritura de comandos con baja latencia, y stream de estado (`connected|reconnecting|...`) + batería.
- **Estado global** (zustand, `src/state/`): dispositivo(s) conectado(s), patrón/intensidad activos, estado de sala. La UI se suscribe; nadie habla con BLE directo salvo el manager.
- **Throttling del gesto**: el pad (Fase 4) usa reanimated/gesture-handler en el hilo de UI y hace *throttle* (~20–33 ms) antes de `write` para no saturar el enlace BLE (saturarlo es lo que causa desconexiones).

## 2. Interacción remota (salas) — modelo híbrido (Fase 6)

Decisión tomada con el usuario: **P2P para el control, servidor ligero para la membresía.**

```
Anfitrión ─┬─ WebRTC DataChannel (comandos de vibración, cifrado) ─┬─ Miembro(s)
           │                                                        │
           └──────── Room Server (socket.io) ◀───────────────────┘
                     solo membresía/roles: unirse, salir, expulsar, bloquear,
                     heartbeat, "terminar sesión". NUNCA ve el contenido del control.
```

Por qué híbrido y no P2P puro:
- P2P mesh con moderación necesita una fuente de verdad de "quién está y quién manda"; si eso vive solo en un peer, se pierde cuando ese peer cae.
- El servidor de sala también permite detectar caídas (heartbeat) y mostrar "conexión perdida" en vez de una sala fantasma → alinea con el objetivo de fiabilidad.
- Privacidad conservada: el servidor solo enruta metadata de sala; los comandos viajan directos entre dispositivos. Esto es lo que comunica el badge de privacidad (frame 07f/07g).

Roles:
- **Anfitrión** (quien comparte el código): panel de participantes, expulsar, bloquear (no puede re-unirse), terminar sesión para todos. Se distingue con el acento P7433.
- **Miembro**: controla pero no ve el panel; badge "Miembro".

Estado actual: `server/`, `shared/roomProtocol.ts`, `src/features/room/RoomClient.ts`, `RoomPeerController.ts` y el estado de sala están implementados. Socket.IO gestiona membresía y señalización; WebRTC DataChannel transporta patrón, intensidad y detener entre pares. El servidor nunca recibe audio, video ni comandos de vibración. La validación pendiente es física, entre dos teléfonos, antes de habilitar video.

## 3. Protocolo con el hardware

Ver `docs/BLE_PROTOCOL.md`. UUID, capacidades y frames de control quedaron confirmados contra el APK y validados en el bullet físico antes de fijar `src/ble/protocol.ts`.

## 4. Principios de código para Codex
- Cero colores hardcodeados: todo desde `src/theme`.
- Cada pantalla mapea a un frame de `src/navigation/routes.ts` (`DESIGN_FRAME_MAP`).
- BLE solo a través de `BleManager`. Nada de `uni.*` ni acceso directo disperso.
- Estados de carga/vacío/error explícitos en toda pantalla que consuma datos (batería, escaneo, sala).
- TypeScript estricto. `npm run typecheck` debe pasar limpio.
