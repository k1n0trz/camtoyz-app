# Roadmap — Camtoyz App

Fases incrementales. Cada una entrega algo verificable en el teléfono físico. No pasar de fase sin cumplir el "Definition of done" (DoD).

## Fase 0 — Base (ESTE SCAFFOLD) ✅
- Estructura RN+TS, tokens de diseño, inventario de rutas, esqueleto BleManager, docs.
- **DoD:** repo abre; `npm install` + `npm run typecheck` en verde tras instalar deps.

## Fase 1 — App corre en dispositivo ✅
- `expo prebuild` + build dev-client en el Android físico. Splash → Dashboard navegan.
- Permisos BLE/ubicación pedidos correctamente.
- **DoD:** la app abre en el teléfono, se ve Splash y Dashboard con los tokens correctos.

## Fase 2 — Conectividad BLE sólida (el diferenciador) ✅
- Implementar `BleManager` con react-native-ble-plx: escaneo (filtrado por nombre), conexión, descubrimiento, MTU, **auto-reconexión con backoff**, lectura de batería.
- Pantallas Scan (02a/b/c) + estados de sistema 09a/09b/09c.
- **Capturar el protocolo real** (docs/BLE_PROTOCOL.md) y fijar `protocol.ts`.
- **DoD:** conectar el bullet, ver batería real, disparar 1 patrón, y que **recupere solo** tras apagar/alejar el dispositivo.

## Fase 3 — Vibración: patrones escalables ✅
- Grid de patrones data-driven (03 + 03b por categorías). Multi-device (03c).
- **DoD:** añadir un patrón nuevo no toca el layout; funciona en el hardware.

## Fase 4 — Control por gesto ("lápiz vibrador") ✅
- Pad con gesture-handler + reanimated en hilo de UI; throttle ~20–33 ms → `BleManager.setIntensity`.
- 04 + 04b (multi-device).
- **DoD:** arrastrar el dedo cambia la intensidad en tiempo real sin cortar la conexión.

## Fase 5 — Sonido y música ✅
- Micrófono → decibelios/curva de respuesta (05). Análisis de música (06).
- **DoD:** sensibilidad y curva ajustan la respuesta de forma perceptible.

## Fase 6 — Interacción remota (salas) — EN CIERRE
- Servidor `server/` (Node + socket.io) para membresía/roles + WebRTC DataChannel para control y video 07g.
- 07a–07g: crear/unirse, panel anfitrión (expulsar/bloquear/terminar), vista miembro, expulsado, badge de privacidad.
- **Progreso:** servidor público, TURN, contrato compartido, seguridad, recuperación de sesión, control remoto y cámara 07g implementados. Crear/unirse, copia de código, reingreso y video se han probado de forma incremental. Pendiente: una regresión completa con dos teléfonos en redes distintas, parada de emergencia del receptor y cierre de todos los estados de desconexión.
- **DoD:** dos teléfonos: uno controla el bullet del otro por sala; el anfitrión expulsa/bloquea; al perder red se ve "conexión perdida", no sala fantasma.

## Fase 7 — Ruta de cierre a 1.0.0

La versión no cambia a `1.0.0` hasta que todas las puertas 7.0–7.7 estén verdes. La candidata interna previa al lanzamiento es `0.9.0`; solo una candidata aprobada se etiqueta como `1.0.0`.

**Decisiones cerradas para 1.0.0 (15 de julio de 2026):**

- Android únicamente; iOS queda para una etapa posterior.
- Distribución interna mediante APK; Play Store y AAB quedan fuera de esta entrega.
- Intense, FlexiCurve, FlexRing y Whisper ya fueron probados físicamente.
- Se pueden conectar dos juguetes, pero el control activo es individual. Este límite se acepta para 1.0.0.
- Las salas siguen limitadas a dos participantes.
- Nombre legal, correo de soporte y textos legales definitivos quedan pendientes del cliente antes de promover `0.9.0` a `1.0.0`.

**Estado actual:** `0.9.0` compilada, firmada e instalada como actualización sobre 0.3.0. CI, Ajustes, consentimiento remoto, parada de emergencia y endurecimiento de la VM están implementados. Faltan la documentación del cliente y la regresión manual final de dos teléfonos para promoverla.

### 7.0 — Congelar alcance y línea base

- Resolver los cambios locales de compatibilidad BLE: conservarlos y validarlos o descartarlos.
- Dejar la rama de release limpia, documentada y reproducible desde un clon nuevo.
- Registrar el alcance Android y el canal APK interno acordados.
- **DoD:** alcance aprobado, árbol Git limpio, versión base instalada coincide con el repositorio y no hay código sin revisión.

### 7.1 — Plataforma, dependencias y build de producción

- Migrar Expo/React Native de forma controlada hasta una combinación mantenida; no usar `npm audit fix --force`.
- Subir Android a `targetSdkVersion` 35 o superior y validar los cambios de permisos y servicios en segundo plano.
- Resolver o aceptar formalmente los hallazgos de `npm audit` y `expo-doctor`, incluida la sustitución de `expo-av` y la compatibilidad de WebRTC con la nueva arquitectura.
- Establecer una única estrategia de configuración nativa para que `app.json`, Android y EAS no diverjan.
- Fijar `EXPO_PUBLIC_ROOM_SERVER_URL=https://app.camtoyz.com` en builds de producción.
- Retirar Expo Dev Client y permisos que no sean indispensables (`SYSTEM_ALERT_WINDOW` y almacenamiento amplio, entre otros).
- Configurar una firma reproducible para APK internas; Play App Signing y AAB se difieren hasta decidir la publicación en Play Store.
- **DoD:** typecheck, lint, pruebas, auditoría aceptada y `expo-doctor` sin fallos no justificados; APK firmada abre sin Metro y apunta al servidor público.

### 7.2 — Seguridad personal, consentimiento y privacidad

- Añadir un botón de parada de emergencia siempre visible para el teléfono que tiene el juguete conectado, incluso dentro de la cámara.
- Exigir aceptación explícita antes de permitir control remoto y permitir revocarlo sin terminar toda la app.
- Garantizar Stop al salir, perder red, cerrar DataChannel, bloquear pantalla, mandar la app al fondo o finalizar la sala.
- Añadir pantalla de Ajustes con política de privacidad, términos, soporte, versión y controles de permisos.
- Definir audiencia adulta, consentimiento para cámara/micrófono y textos de seguridad de uso.
- Corregir la promesa “directo entre dispositivos”: TURN puede retransmitir tráfico cifrado aunque no pueda leer su contenido.
- Preparar el inventario de datos y permisos necesario para los textos internos; Data Safety de Google se completa cuando se reactive Play Store.
- **DoD:** el receptor puede detener y revocar el control en todo momento; textos legales aprobados y accesibles dentro de la app.

### 7.3 — Matriz BLE y catálogo de productos

- Conservar el registro de las pruebas físicas ya superadas para detección, nombre, imagen, conexión y control de Intense, FlexiCurve, FlexRing y Whisper.
- Mantener HyperBullet como dispositivo de regresión aunque todavía use imagen neutra.
- Mantener como alcance aceptado la conexión simultánea de dos juguetes con control de uno a la vez; el control simultáneo queda para una versión posterior.
- Probar recuperación BLE en Samsung y al menos dos fabricantes Android adicionales, cubriendo Android 10/11 y Android 12+ cuando haya equipos disponibles.
- Documentar recuperación cuando Android necesite reiniciar Bluetooth o el teléfono.
- **DoD:** cada modelo soportado tiene una ficha de resultados; multi-dispositivo funciona físicamente y ninguna desconexión deja un motor activo.

### 7.4 — Salas, TURN y cámara entre dos teléfonos

- Ejecutar la matriz anfitrión/miembro con Wi‑Fi/Wi‑Fi, Wi‑Fi/datos móviles y datos móviles/datos móviles.
- Verificar crear, copiar código, unirse, salir, volver a la sala, expulsar, bloquear y terminar.
- Verificar patrón, intensidad continua, Stop, pérdida de DataChannel y recuperación de sesión.
- Verificar cámara local y remota simultáneas, silenciar, apagar cámara, cambiar cámara y detener video.
- Confirmar que el límite de dos participantes se mantiene y que una tercera persona no puede entrar.
- Probar TURN por UDP y TCP, no solo disponibilidad del puerto.
- **DoD:** matriz completa sin vibración sostenida, sala fantasma, cámara perdida ni dependencia de que ambos teléfonos estén en la misma red.

### 7.5 — Experiencia, accesibilidad y pantallas pendientes

- Corregir contrastes inferiores a WCAG AA y revisar estados deshabilitados/errores.
- Probar TalkBack, orden de lectura, etiquetas, áreas táctiles y fuente ampliada.
- Completar `SettingsDevice` y decidir si `GestureMultiDevice` será ruta propia o parte de `MultiDevice`.
- Implementar el modo oscuro prometido o retirarlo del alcance 1.0.0 de forma explícita.
- Mantener español como idioma base y decidir si i18n técnico entra en 1.0.0 aunque solo se publique ES inicialmente.
- Validar pantallas pequeñas, diferentes densidades y retorno desde segundo plano.
- **DoD:** recorrido principal usable con TalkBack y fuente grande, contraste AA y ninguna ruta declarada queda huérfana.

### 7.6 — Pruebas, CI e infraestructura

- Añadir pruebas móviles para protocolo BLE, detector de beats, stores y comandos remotos; conservar las pruebas de integración del servidor.
- Crear CI para typecheck, lint, pruebas, auditoría y build Android reproducible.
- Añadir monitoreo de `/health`, alertas, rotación de logs y procedimiento de restauración de la VM.
- Auditar firewall, puertos TURN, parches del sistema, secretos y reinicio de contenedores.
- Añadir límites por IP/infraestructura además del límite por socket y registrar solo metadatos no sensibles.
- Documentar que las salas son efímeras y que una sola VM es un punto único de falla aceptado para el lanzamiento inicial.
- **DoD:** un commit limpio pasa CI; una caída simulada produce alerta y el equipo puede restaurar el servicio con el runbook.

### 7.7 — Candidata, distribución y lanzamiento

- Generar `0.9.0`: APK interna para QA. AAB/Play y EAS/TestFlight quedan fuera del alcance actual.
- Ejecutar regresión completa desde instalaciones limpias y actualización desde 0.3.0 en los teléfonos disponibles.
- Preparar notas de versión, inventario de permisos y paquete de documentación interna; la ficha de tienda se difiere.
- Probar instalación desde el canal real de distribución, no mediante ADB.
- Crear tag y release de GitHub solo después de aprobar la candidata.
- **DoD:** checklist firmado, cero bloqueantes abiertos, rollback documentado y artefactos reproducibles archivados.

## Orden de ejecución recomendado

1. 7.0 — Línea base y decisiones de alcance.
2. 7.1 — Plataforma/build; desbloquea todas las pruebas posteriores.
3. 7.2 — Seguridad y privacidad, antes de ampliar pruebas remotas.
4. 7.3 y 7.4 — Hardware BLE y salas/cámara.
5. 7.5 — Accesibilidad y cierre de producto.
6. 7.6 — Automatización e infraestructura.
7. 7.7 — Candidata y lanzamiento.

## Backlog / decisiones abiertas

- Cuentas de usuario y bloqueos resistentes a reinstalaciones.
- Escalado horizontal del servidor con estado/adapter compartido.
- Salas de más de dos personas; quedan fuera de 1.0.0 por decisión de producto.
- Control simultáneo de dos juguetes; 1.0.0 mantiene control individual.
- Publicación en Play Store e iOS.
- Telemetría opt-in avanzada; 1.0.0 solo necesita observabilidad técnica sin contenido sensible.
- Confirmar con cada proveedor las capacidades y diferencias de firmware que no puedan inferirse mediante FFE4.
