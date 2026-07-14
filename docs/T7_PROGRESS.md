# T7 — Interacción remota por salas

## Estado

La primera entrega de la Fase 6 está terminada: servidor de membresía, roles, moderación y señalización WebRTC, con contrato TypeScript compartido. El cliente móvil, las pantallas 07a–07g y la prueba física entre dos teléfonos siguen pendientes.

## Decisiones cerradas

- MVP con salas efímeras y anónimas mediante código de seis caracteres.
- Anfitrión y miembro son roles determinados por el servidor.
- El servidor solo conoce metadatos de sala y señales de conexión.
- Audio, video y comandos de control no pasan por el servidor.
- El control viajará entre teléfonos por WebRTC DataChannel.
- Si el anfitrión no recupera la conexión dentro de la ventana configurada, la sala termina para evitar sesiones fantasma.
- Expulsión y bloqueo son operaciones exclusivas del anfitrión.

## Seguridad incorporada

- Códigos generados con aleatoriedad criptográfica y sin caracteres ambiguos.
- Tokens secretos de recuperación almacenados como hash SHA-256 y comparados en tiempo constante.
- Validación estricta de identificadores, nombres y señales.
- Límite de participantes, tamaño de mensajes y frecuencia de eventos.
- CORS configurable, buffers acotados y caducidad automática de salas.
- `server/.env`, artefactos compilados y secretos quedan fuera de Git.

## Validación automatizada

- 8 pruebas de integración del servidor: crear/unirse, permisos, bloquear, señalización, terminar, recuperar, desconexión del anfitrión, salud y aforo.
- `npm run typecheck` y `npm run lint` cubren la aplicación.
- Auditoría de dependencias de producción del workspace del servidor: 0 vulnerabilidades conocidas al momento de esta entrega.

## Próxima entrega

1. `RoomClient` móvil y un identificador persistente por instalación.
2. Crear/unirse/reanudar una sala y sincronizar participantes.
3. Pantallas 07a–07f con estados de desconexión y moderación.
4. WebRTC DataChannel para control remoto; video 07g queda opcional.
5. Validación física entre dos teléfonos, con la bala conectada al teléfono receptor.
