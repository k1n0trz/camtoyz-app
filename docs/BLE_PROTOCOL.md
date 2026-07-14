# Protocolo BLE — Camtoyz (notas de ingeniería inversa)

## Confirmado desde el APK OmniRemote (`assets/apps/.../app-service.js`, `common/utils/bluetooth.js`)

- Módulo BLE tipo serie (HM-10/JDY genérico).
- **Service de comandos:** `0000FFE0-0000-1000-8000-00805F9B34FB`
- **Service de init/handshake:** `0000FFFE-0000-1000-8000-00805F9B34FB` (visto en `connectingDevices`)
- Escritura de comandos: **FFE2** dentro de FFE0, confirmada en `common/utils/bluetooth.js` del APK.
- Handshake/init: **FFE3** con `88 00` seguido de `88 01`.
- Notificaciones de información/capacidades: **FFE4**; las respuestas observadas comienzan con `66 00` o `66 01`.
- Batería propietaria confirmada en OmniRemote: notificación FFE4 `66 03 XX`; `XX` es el porcentaje hexadecimal y se limita a 100.
- Se observó un frame con `DataView.setUint8(0,136); setUint8(1,1)` (136 = 0x88) en una ruta de init — posible cabecera de comando. **Confirmar.**
- Identificación legacy confirmada: además de `LHD BLE`, `DSJM` y un UUID anunciado que contiene `ACAB`, OmniRemote exige la firma ASCII `LHD` (`4C 48 44`) dentro de los bytes del anuncio.
- `HyperBullet` es un alias comercial obtenido por OmniRemote desde su catálogo remoto; no necesariamente coincide con `name`/`localName` del periférico. La app nueva identifica primero la firma estable y aplica el alias después.
- El HyperBullet físico validado anuncia el nombre bruto `LY379A`; se conserva un alias local explícito para que el producto siga apareciendo como `HyperBullet` después de conectar.
- Los comandos de motor comienzan con `0x89`; el frame depende del número de canales reportado por el dispositivo.
- El HyperBullet probado respondió `66 01 02 00 05`: un canal y cinco patrones (`P1..P5`).
- FFE2 expone *write without response*. En la captura HCI corresponde al ATT Write Command `0x52`, handle `0x0029`.

## Frames reales de control

No hay checksum, terminador ni CRC.

- Intensidad continua global: `89 04 N v0 … vN-1`. Cada `v` usa rango raw `0..255`; la UI convierte `0..100%` linealmente.
- Estado de patrón: `89 05 2N s0 p0 … sN-1 pN-1`. Cada `s` es intensidad discreta `0..10`; cada `p` es patrón, limitado por `66 01`.
- Stop continuo: `89 04 N 00…`.
- Stop patrón: `89 05 2N 01 00…`.
- Calefacción, para hardware que la exponga: `89 06 h0 … hN-1`.

Vectores validados para el HyperBullet de un canal:

| Acción | Bytes FFE2 |
|---|---|
| P1, intensidad mínima | `89 05 02 01 01` |
| Intensidad continua 10% | `89 04 01 1A` |
| Stop continuo | `89 04 01 00` |
| Stop patrón | `89 05 02 01 00` |

La captura HCI registró estos cuatro valores exactamente sobre handle `0x0029`. Un `00` aislado **no** es un comando de parada válido.

### Datos confirmados y preguntas abiertas para el proveedor
- El firmware soporta intensidad continua raw `0..255` y, en modo patrón, intensidad discreta `0..10`.
- El HyperBullet no expone Battery Service estándar `0x2A19`; informa la batería mediante FFE4 `66 03 XX`.
- El enlace probado negoció MTU 260 correctamente.
