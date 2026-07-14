# T7 — Interacción remota por salas

## Estado

La segunda entrega de la Fase 6 está en curso: servidor, cliente móvil de salas y DataChannel de control están implementados. Las pantallas 07a–07f compilan; en Galaxy se validó crear una sala y la actualización en tiempo real del panel del anfitrión al unirse un segundo participante. Queda la prueba física entre dos teléfonos del canal P2P y la pantalla de video opcional 07g.

## Decisiones cerradas

- MVP con salas efímeras y anónimas mediante código de seis caracteres.
- Anfitrión y miembro son roles determinados por el servidor.
- El servidor solo conoce metadatos de sala y señales de conexión.
- Audio, video y comandos de control no pasan por el servidor.
- El control viajará entre teléfonos por WebRTC DataChannel.
- El teléfono anfitrión recibe patrón, intensidad y detención solo por el canal P2P; el servidor no puede leer esos comandos.
- Si el DataChannel se cierra o falla, el receptor envía una detención BLE de seguridad.
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

- 9 pruebas de integración del servidor: crear/unirse, permisos, bloquear, señalización, terminar, recuperar y reemplazar un socket anterior, desconexión del anfitrión, salud y aforo.
- `npm run typecheck` y `npm run lint` cubren la aplicación.
- Auditoría de dependencias de producción del workspace del servidor: 0 vulnerabilidades conocidas al momento de esta entrega.

## Próxima entrega

1. Validación física entre dos teléfonos, con la bala conectada al anfitrión/receptor.
2. Confirmar patrón, intensidad, detener y parada automática al perder DataChannel.
3. Configurar STUN/TURN propio para uso fuera de la misma red local.
4. Video opcional 07g y cámara/efectos solo después de cerrar el control remoto.
