# T3 · Protocolo real

Inicio: 2026-07-10 · cierre: 2026-07-14

## Implementado

- Parser de capacidades FFE4 `66 01 LL ...` y límites por canal.
- Frame continuo `89 04 N ...`, con conversión `0..100%` a `0..255`.
- Frame de patrón `89 05 2N ...`, conservando el estado completo por canal.
- Stop de emergencia doble: apaga tanto modo continuo como modo patrón.
- FFE2 obligatorio; se eliminó el fallback a características escribibles desconocidas.
- P1..Pn habilitados desde las capacidades reales del dispositivo; el Dashboard ya no muestra P1 activo por defecto.
- Botón Stop permanente y estado visible `Motor detenido` / `Patrón Pn activo`.
- Stop best-effort antes de desconectar y automático cuando la app pasa a segundo plano.
- Stop automático al salir del Dashboard hacia otra pantalla.
- La reconexión restablece estado detenido y nunca reproduce el último comando.

## Validación en Galaxy S22+ + HyperBullet

- Respuesta de capacidad: `66 01 02 00 05` → un canal, cinco patrones.
- Vectores unitarios ejecutados: 7/7 correctos.
- Stop preventivo: `89 04 01 00` + `89 05 02 01 00`.
- P1 mínimo durante un segundo: `89 05 02 01 01`, seguido por ambos stops.
- Intensidad continua 10% durante un segundo: `89 04 01 1A`, seguida por ambos stops.
- Al mandar la app al fondo con P1 activo, emitió ambos stops y volvió mostrando `Motor detenido`.
- Al abrir la búsqueda con P1 activo, el evento `blur` emitió ambos stops antes de mostrar Scan.
- Al desconectar, emitió ambos stops y Android terminó con `GATT_MAX_PHY_CHANNEL in_use: 0`.

## Evidencia HCI

Se habilitó temporalmente el registro HCI completo, se reinició Bluetooth, se capturó un bugreport y se deshabilitó nuevamente. La captura contiene ATT Write Command `0x52` hacia FFE2/handle `0x0029` con los valores exactos:

```text
89 05 02 01 01  # P1 mínimo
89 04 01 1A     # continuo 10%
89 04 01 00     # stop continuo
89 05 02 01 00  # stop patrón
```

Evidencia visual: [controles T3 en el S22+](screenshots/t3-pattern-controls-s22.png).

## Seguridad

- Las pruebas activas duraron un segundo y siempre terminaron con los dos formatos de Stop.
- No se persiste ni reproduce actividad al reconectar.
- El registro HCI completo quedó en estado `DISABLED` al finalizar.
