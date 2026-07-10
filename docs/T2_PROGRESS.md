# T2 · Progreso de conectividad BLE

Fecha: 2026-07-10

## Implementado

- Permisos BLE diferenciados para Android 12+ y versiones anteriores.
- Escaneo nativo centralizado y limitado a 30 segundos.
- Filtro confirmado contra el APK legacy: firma binaria `LHD` (`4C 48 44`), nombres `LHD BLE`/`DSJM` y servicio `ACAB`.
- Alias comercial `HyperBullet` desacoplado del nombre BLE bruto que anuncia el hardware.
- Identificador bruto del hardware probado confirmado como `LY379A` y asociado localmente a `HyperBullet`.
- Singleton BLE conservado durante Fast Refresh y recuperación de conexiones GATT existentes.
- Deduplicación de periféricos y RSSI visible.
- Conexión GATT, negociación de MTU y descubrimiento de características.
- Handshake legacy por FFE3 (`88 00`, `88 01`) y monitor FFE4.
- Escritura centralizada por FFE2, con preferencia por *without response*.
- Lectura de batería propietaria mediante notificaciones FFE4 `66 03 XX`, con fallback al Battery Service estándar cuando exista.
- Reconexión automática con backoff y cancelación explícita.
- Store Zustand para conexión, dispositivo, resultados y errores.
- Pantalla Scan con estados buscando, encontrados y timeout/error.
- Overlays de reconexión, error y batería baja.

## Validado en Galaxy S22+

- Permisos `BLUETOOTH_SCAN` y `BLUETOOTH_CONNECT` concedidos.
- Escaneo nativo activo sin errores JavaScript ni excepciones fatales.
- HyperBullet detectado por su firma real con RSSI entre -31 y -40 dBm.
- Conexión GATT estable: MTU solicitado 185, negociado 260, descubrimiento completo y notificaciones FFE4 habilitadas.
- Recuperación de una conexión existente validada al volver a la pantalla de escaneo.
- Reconexión automática validada apagando y encendiendo Bluetooth en el teléfono: overlay `Reconectando…` y retorno a `Conectado · BLE`.
- Desconexión explícita validada; Android terminó con `GATT_MAX_PHY_CHANNEL in_use: 0`.
- El firmware no expone Battery Service estándar; la batería se obtiene del frame propietario FFE4 `66 03 XX`.
- Batería propietaria validada en hardware: el frame reportó y el dashboard mostró `38%`.
- Se diagnosticó y cerró una conexión GATT huérfana; Android confirmó `GATT_CH_CLOSE` y el desregistro del cliente.
- Evidencia: [detección real](screenshots/t2-lhd-detection-s22.png), [conexión con batería real](screenshots/t2-battery-s22.png) y [timeout controlado](screenshots/t2-scan-timeout-s22.png).

## Cierre de T2

- Detección, conexión, recuperación, reconexión y desconexión quedan validadas con el hardware físico.
- La ausencia de Battery Service estándar queda cubierta mediante el protocolo propietario usado por OmniRemote.
- No se enviaron comandos de motor; su validación permanece bloqueada hasta T3 con una captura o prueba controlada.
