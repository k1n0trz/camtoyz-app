# Servidor de salas Camtoyz

Servidor ligero de membresía, roles, moderación y señalización WebRTC. Es el plano de control de las salas: **no recibe audio, video ni comandos BLE/de vibración**. El control remoto viajará cifrado entre teléfonos mediante WebRTC DataChannel.

## Ejecutar

Desde la raíz del repositorio:

```bash
npm install
npm run server:test
npm run server:build
npm run server:start
```

El endpoint `GET /health` devuelve el estado del servicio. La configuración parte de `server/.env.example`:

| Variable | Uso |
|---|---|
| `PORT` | Puerto HTTP/Socket.IO. |
| `ROOM_ALLOWED_ORIGINS` | Orígenes web permitidos, separados por coma. Los clientes nativos sin `Origin` son aceptados. |
| `ROOM_MAX_PARTICIPANTS` | Límite total por sala, incluido el anfitrión. |
| `ROOM_TTL_MS` | Vida máxima de una sala. |
| `ROOM_RECOVERY_WINDOW_MS` | Ventana para recuperar una desconexión antes de cerrar la sala del anfitrión. |

## Contrato

El contrato tipado vive en `shared/roomProtocol.ts`. Los eventos principales son:

- `room:create`, `room:join`, `room:resume`, `room:leave`
- `room:kick`, `room:block`, `room:end`
- `peer:signal` para ofertas, respuestas y candidatos WebRTC
- `room:updated`, `room:kicked`, `room:ended`, `peer:signal`

Los roles y permisos se resuelven en el servidor. El token secreto de recuperación se almacena únicamente como hash. Los códigos de sala son aleatorios y los mensajes de señalización tienen tamaño limitado.

## Límites del MVP

- Las salas viven en memoria y esta versión debe desplegarse como una sola instancia. Escalar horizontalmente requerirá almacenamiento/adapter compartido compatible con la recuperación de conexiones.
- El bloqueo usa un identificador persistente de instalación. Al no existir cuentas, reinstalar o borrar datos puede eludirlo; esto se debe reevaluar antes de producción pública.
- El limitador de eventos es por socket. En producción debe complementarse con límites por IP/infraestructura y observabilidad sin contenido sensible.
- Producción requiere HTTPS/WSS y una lista explícita de orígenes web permitidos.
