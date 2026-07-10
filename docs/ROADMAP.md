# Roadmap — Camtoyz Control

Fases incrementales. Cada una entrega algo verificable en el teléfono físico. No pasar de fase sin cumplir el "Definition of done" (DoD).

## Fase 0 — Base (ESTE SCAFFOLD) ✅
- Estructura RN+TS, tokens de diseño, inventario de rutas, esqueleto BleManager, docs.
- **DoD:** repo abre; `npm install` + `npm run typecheck` en verde tras instalar deps.

## Fase 1 — App corre en dispositivo
- `expo prebuild` + build dev-client en el Android físico. Splash → Dashboard navegan.
- Permisos BLE/ubicación pedidos correctamente.
- **DoD:** la app abre en el teléfono, se ve Splash y Dashboard con los tokens correctos.

## Fase 2 — Conectividad BLE sólida (el diferenciador)
- Implementar `BleManager` con react-native-ble-plx: escaneo (filtrado por nombre), conexión, descubrimiento, MTU, **auto-reconexión con backoff**, lectura de batería.
- Pantallas Scan (02a/b/c) + estados de sistema 09a/09b/09c.
- **Capturar el protocolo real** (docs/BLE_PROTOCOL.md) y fijar `protocol.ts`.
- **DoD:** conectar el bullet, ver batería real, disparar 1 patrón, y que **recupere solo** tras apagar/alejar el dispositivo.

## Fase 3 — Vibración: patrones escalables
- Grid de patrones data-driven (03 + 03b por categorías). Multi-device (03c).
- **DoD:** añadir un patrón nuevo no toca el layout; funciona en el hardware.

## Fase 4 — Control por gesto ("lápiz vibrador")
- Pad con gesture-handler + reanimated en hilo de UI; throttle ~20–33 ms → `BleManager.setIntensity`.
- 04 + 04b (multi-device).
- **DoD:** arrastrar el dedo cambia la intensidad en tiempo real sin cortar la conexión.

## Fase 5 — Sonido y música
- Micrófono → decibelios/curva de respuesta (05). Análisis de música (06).
- **DoD:** sensibilidad y curva ajustan la respuesta de forma perceptible.

## Fase 6 — Interacción remota (salas)
- Servidor `server/` (Node + socket.io) para membresía/roles + WebRTC DataChannel para control. Video opcional (07g).
- 07a–07g: crear/unirse, panel anfitrión (expulsar/bloquear/terminar), vista miembro, expulsado, badge de privacidad.
- **DoD:** dos teléfonos: uno controla el bullet del otro por sala; el anfitrión expulsa/bloquea; al perder red se ve "conexión perdida", no sala fantasma.

## Fase 7 — Pulido y release
- Dark mode en pantallas clave, i18n (ES base), accesibilidad AA, settings (08), manejo de errores, telemetría mínima opt-in.
- Builds de release (EAS para iOS).

## Backlog / decisiones abiertas
- ¿iOS desde el inicio o Android primero? (EAS Build cubre iOS sin Mac).
- Confirmar con proveedor: rango de intensidad del firmware, batería GATT, MTU máx.
- ¿Cuentas de usuario o salas anónimas por código? (afecta servidor de Fase 6).
