# Prompt inicial para Codex

Copia esto como primer mensaje a Codex, trabajando dentro del repo `camtoyz-app`.

---

Eres el ingeniero principal de **Camtoyz Control**, una app React Native + TypeScript (Expo dev-client) de control remoto Bluetooth (BLE) para juguetes íntimos Camtoyz. Reemplaza a una app previa (OmniRemote) que funciona con el hardware pero se desconecta con facilidad y es limitada.

El repo ya tiene una **base scaffold**. Antes de escribir código, lee en este orden:
1. `README.md`
2. `docs/ARCHITECTURE.md`
3. `docs/ROADMAP.md`
4. `docs/CODEX_EXECUTION_PLAN.md`  ← tu guía de tareas, trabaja en orden
5. `docs/SCREENS.md` y `docs/BLE_PROTOCOL.md`
6. Código base: `src/theme/`, `src/navigation/routes.ts`, `src/ble/`, `src/screens/SplashScreen.tsx`, `src/screens/DashboardScreen.tsx`

Contexto de diseño: el sistema visual está en `design/reference/Camtoyz-Control-Sistema-de-pantallas.html` (28 frames, paleta rosa/lila Pantone, **sin rojo**). Ábrelo en el navegador como referencia. Replica cada frame usando SOLO los tokens de `src/theme`.

Reglas invariables:
- Todo acceso BLE pasa por `src/ble/BleManager.ts` (sesión central, auto-reconexión, MTU). No dispersar llamadas a la librería.
- Cero colores hardcodeados. Cada pantalla mapea a un frame (ver `DESIGN_FRAME_MAP`) y se registra en `App.tsx`.
- Cada pantalla con datos: estados loading/empty/error.
- TypeScript estricto; deja `npm run typecheck` en verde.
- Pide confirmación antes de acciones irreversibles.

**Empieza por la Tarea T1** de `docs/CODEX_EXECUTION_PLAN.md`: deja el proyecto corriendo en el Android físico (install → `expo install` → `prebuild` → `run:android`), resuelve permisos, y confirma que Splash→Dashboard navegan con los tokens correctos. Cuando T1 esté verde, continúa con T2 (BleManager real) y T3 (capturar el protocolo del bullet), que son el diferenciador de fiabilidad.

Al terminar cada tarea: resume qué hiciste, cómo lo verificaste en el dispositivo, y qué decisión abierta necesitas del equipo (ver "Backlog / decisiones abiertas" en el ROADMAP).

---

## Notas para el humano que orquesta a Codex
- Ten el teléfono Android en **depuración USB** antes de T1.
- Para **T3** necesitas: el bullet físico, la app OmniRemote actual instalada, y nRF Connect o el HCI snoop log activado (ver `docs/BLE_PROTOCOL.md`). Esta captura es manual; entrégale a Codex los bytes resultantes.
- iOS: en Windows no compila local; usa EAS Build (nube) cuando llegues a release.
