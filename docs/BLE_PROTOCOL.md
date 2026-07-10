# Protocolo BLE — Camtoyz (notas de ingeniería inversa)

## Confirmado desde el APK OmniRemote (`assets/apps/.../app-service.js`, `common/utils/bluetooth.js`)

- Módulo BLE tipo serie (HM-10/JDY genérico).
- **Service de comandos:** `0000FFE0-0000-1000-8000-00805F9B34FB`
- **Service de init/handshake:** `0000FFFE-0000-1000-8000-00805F9B34FB` (visto en `connectingDevices`)
- Escritura vía `uni.writeBLECharacteristicValue(...)`. La característica de escritura dentro de FFE0 típicamente es **FFE1** (confirmar por descubrimiento).
- Se observó un frame con `DataView.setUint8(0,136); setUint8(1,1)` (136 = 0x88) en una ruta de init — posible cabecera de comando. **Confirmar.**
- Nombres de dispositivo para filtrar escaneo: `HyperBullet`, `Duo Egg` (marca CAMTOYZ).

## PENDIENTE — capturar con hardware físico (tienes: 2 teléfonos, cable, 1 bullet)

Objetivo: documentar el **frame exacto** que la app manda para (a) cada patrón P1..Pn y (b) intensidad continua.

### Método recomendado (sin descompilar más)
1. Teléfono A: instala **nRF Connect** (Nordic) o usa el logcat con `BLUETOOTH` verbose.
2. Empareja el bullet con la app **OmniRemote actual** y activa cada nivel de vibración.
3. Con nRF Connect en modo *sniffer* (o el HCI snoop log de Android: Ajustes desarrollador → "Habilitar registro Bluetooth HCI"), captura los bytes escritos en FFE0/FFE1 para:
   - Cada uno de los 5 patrones actuales.
   - Si hay slider de intensidad (sonido/música), varios valores para inferir la escala (lineal vs no lineal, rango 0..? ).
4. Exporta el `btsnoop_hci.log` y ábrelo en Wireshark → filtra `btatt` → columna *Value*.

### Qué rellenar después en `src/ble/protocol.ts`
- `buildIntensityCommand`: rango real (¿0..100? ¿0..255? ¿con cabecera/checksum?).
- `buildPatternCommand`: opcode + índice reales.
- `stopCommand`: confirmar (¿0x00 basta o requiere frame completo?).
- Confirmar `characteristicWrite` real y si `withoutResponse` es soportado (clave para latencia del gesto).

### Preguntas abiertas para el proveedor del hardware (si hay contacto)
- ¿El firmware soporta intensidad continua (byte 0..255) o solo N escalones discretos? → define cuántos patrones/niveles reales se pueden exponer (defecto #2).
- ¿Expone batería vía alguna característica GATT estándar (0x2A19) o propietaria? → hoy el dashboard muestra %, confirmar de dónde sale.
- ¿MTU máximo soportado? → afecta fiabilidad de escritura.
