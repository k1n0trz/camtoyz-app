# T2 · Progreso de conectividad BLE

Fecha: 2026-07-10

## Implementado

- Permisos BLE diferenciados para Android 12+ y versiones anteriores.
- Escaneo nativo centralizado y limitado a 30 segundos.
- Filtro confirmado contra el APK legacy: `LHD BLE`, `DSJM` y servicio `ACAB`.
- Deduplicación de periféricos y RSSI visible.
- Conexión GATT, negociación de MTU y descubrimiento de características.
- Handshake legacy por FFE3 (`88 00`, `88 01`) y monitor FFE4.
- Escritura centralizada por FFE2, con preferencia por *without response*.
- Lectura/monitor de Battery Service cuando el firmware lo expone.
- Reconexión automática con backoff y cancelación explícita.
- Store Zustand para conexión, dispositivo, resultados y errores.
- Pantalla Scan con estados buscando, encontrados y timeout/error.
- Overlays de reconexión, error y batería baja.

## Validado en Galaxy S22+

- Permisos `BLUETOOTH_SCAN` y `BLUETOOTH_CONNECT` concedidos.
- Escaneo nativo activo sin errores JavaScript ni excepciones fatales.
- Filtro de falsos positivos corregido y timeout de 30 segundos verificado.
- Evidencia: [estado de timeout](screenshots/t2-scan-timeout-s22.png).

## Pendiente para cerrar T2

- Encender el bullet y verificar su identificador anunciado real.
- Conectar y confirmar servicios/características en el hardware.
- Confirmar batería real y recuperación automática al apagar/encender el bullet.
- No se envían comandos de motor hasta cerrar T3 con una captura o verificación controlada.
