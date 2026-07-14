# T5 · Control por gesto

Inicio: 2026-07-14

## Implementado

- Pantalla `GestureControl` registrada desde el Dashboard.
- Pad táctil con `react-native-gesture-handler` y `react-native-reanimated`.
- Mapeo vertical: arriba es 100% y abajo es 0%.
- Throttle de 33 ms con coalescencia del último valor pendiente para no inundar FFE2.
- Congelar nivel retiene la intensidad actual sin enviar movimientos adicionales.
- Stop visible, limpieza de valores pendientes y Stop al abandonar la pantalla.
- Stop invalida el gesto y la cola en curso, espera como máximo el write activo y después emite el Stop doble. El botón Stop nunca queda bloqueado por un cambio de intensidad pendiente.

## Validación local

- `npm run typecheck`: correcto.
- `npm run lint`: correcto.
- Vectores de intensidad: 5/5 (`0%`, `50%`, `100%` y límites).
- Galaxy S22+ + HyperBullet: gesto corto emitió intensidades continuas ascendentes y terminó en `89 04 01 00` + `89 05 02 01 00`, sin writes posteriores.
- Galaxy S22+ + HyperBullet: al mandar la app a segundo plano durante el gesto se enviaron los mismos dos Stops como últimos frames.
- Tras cerrar la app, Android confirmó `GATT_MAX_PHY_CHANNEL in_use: 0`.

## Pendiente de ampliación

- Captura HCI de cadencia para una medición de intervalo exacta; la limitación de 33 ms está aplicada en la cola JavaScript y validada funcionalmente.
- Validar el modo GestureMultiDevice cuando exista multi-conexión BLE real.
