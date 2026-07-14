# T4 · Vibración escalable

Inicio: 2026-07-14

## Implementado

- Catálogo de patrones data-driven en `src/features/patterns/catalog.ts`.
- Diez patrones visuales organizados en Constantes, Ondas y Ráfagas.
- El Dashboard usa el catálogo, conserva los cinco accesos rápidos y abre `PatternsAll` desde “Ver todos”.
- `PatternsAll` reutiliza las mismas celdas y se amplía sin cambiar el layout.
- Cada patrón se habilita exclusivamente si el periférico lo anuncia por FFE4. HyperBullet habilitará P1..P5; P6..P10 quedan visibles, pero bloqueados.
- Pantalla `MultiDevice` preparada para administrar el dispositivo activo y añadir otro. No simula conexiones simultáneas: el transporte BLE actual sigue siendo de una conexión hasta validarlo con dos periféricos.
- Ícono de aplicación integrado desde el original entregado: icono general 1024×1024 y foreground adaptativo con transparencia para Android.

## Validación local

- `npm run typecheck`: correcto.
- `npm run lint`: correcto.
- `npx expo export --platform android`: correcto.
- `npx expo prebuild --platform android --no-install` y `assembleDebug`: correctos.

## Pendiente de cierre

- Instalar la build en el Galaxy S22+ y revisar Dashboard, Todos los patrones, Mis dispositivos y el icono del launcher.
- Con HyperBullet encendido: confirmar que P1..P5 permanecen operativos y P6..P10 permanecen bloqueados.
- Validar multi-conexión real cuando haya un segundo periférico físico compatible.
