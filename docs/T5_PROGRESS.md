# T5 · Control por gesto

Inicio: 2026-07-14

## Implementado

- Pantalla `GestureControl` registrada desde el Dashboard.
- Pad táctil con `react-native-gesture-handler` y `react-native-reanimated`.
- Mapeo vertical: arriba es 100% y abajo es 0%.
- Throttle de 33 ms con coalescencia del último valor pendiente para no inundar FFE2.
- Congelar nivel retiene la intensidad actual sin enviar movimientos adicionales.
- Stop visible, limpieza de valores pendientes y Stop al abandonar la pantalla.

## Validación local

- `npm run typecheck`: correcto.
- `npm run lint`: correcto.
- Vectores de intensidad: 5/5 (`0%`, `50%`, `100%` y límites).

## Pendiente de cierre

- Instalar en Galaxy S22+ y comprobar que el trazo cambia la intensidad de forma fluida.
- Confirmar en HCI que los frames continuos `89 04 01 VV` no superan una cadencia de aproximadamente 33 ms.
- Verificar Stop al congelar/salir y después de llevar la app a segundo plano.
