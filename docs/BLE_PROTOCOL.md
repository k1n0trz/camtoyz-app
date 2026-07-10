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
- Los comandos de motor observados comienzan con `0x89`; el frame depende del número de motores/canales reportado por el dispositivo.

## PENDIENTE — capturar con hardware físico (tienes: 2 teléfonos, cable, 1 bullet)

Objetivo: documentar el **frame exacto** que la app manda para (a) cada patrón P1..Pn y (b) intensidad continua.

### Método recomendado (sin descompilar más)
1. Teléfono A: instala **nRF Connect** (Nordic) o usa el logcat con `BLUETOOTH` verbose.
2. Empareja el bullet con la app **OmniRemote actual** y activa cada nivel de vibración.
3. Con nRF Connect en modo *sniffer* (o el HCI snoop log de Android: Ajustes desarrollador → "Habilitar registro Bluetooth HCI"), captura los bytes escritos en FFE0/FFE2 para:
   - Cada uno de los 5 patrones actuales.
   - Si hay slider de intensidad (sonido/música), varios valores para inferir la escala (lineal vs no lineal, rango 0..? ).
4. Exporta el `btsnoop_hci.log` y ábrelo en Wireshark → filtra `btatt` → columna *Value*.

### Qué rellenar después en `src/ble/protocol.ts`
- `buildIntensityCommand`: rango real (¿0..100? ¿0..255? ¿con cabecera/checksum?).
- `buildPatternCommand`: opcode + índice reales.
- `stopCommand`: confirmar (¿0x00 basta o requiere frame completo?).
- Confirmar `characteristicWrite` real y si `withoutResponse` es soportado (clave para latencia del gesto).

### Datos confirmados y preguntas abiertas para el proveedor
- ¿El firmware soporta intensidad continua (byte 0..255) o solo N escalones discretos? → define cuántos patrones/niveles reales se pueden exponer (defecto #2).
- El HyperBullet no expone Battery Service estándar `0x2A19`; informa la batería mediante FFE4 `66 03 XX`.
- ¿MTU máximo soportado? → afecta fiabilidad de escritura.
