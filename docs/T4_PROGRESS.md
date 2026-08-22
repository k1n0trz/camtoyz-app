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

## Validación en Galaxy S22+ + HyperBullet

- Build instalada y Dashboard, Todos los patrones y Mis dispositivos cargan correctamente.
- HyperBullet anunció cinco patrones: P1..P5 quedaron habilitados y P6..P10 quedaron bloqueados en la UI.
- P1 emitió `89 05 02 01 01`; al detenerlo, los últimos frames fueron `89 04 01 00` y `89 05 02 01 00`.
- La configuración de icono general y adaptive icon se incluyó en la build Android instalada.

## Pendiente de ampliación

- Validar multi-conexión real cuando haya un segundo periférico físico compatible.
