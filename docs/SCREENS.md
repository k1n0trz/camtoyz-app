# Inventario de pantallas (28 frames)

Fuente: `design/reference/Camtoyz-Control-Sistema-de-pantallas.html` (Claude Design).
Contrato de rutas: `src/navigation/routes.ts`. Estado por pantalla: ✅ base hecha · 🟡 stub/por construir.

| Frame diseño | Ruta / estado | Notas de implementación | Estado |
|---|---|---|---|
| 00 Tokens | `src/theme/tokens.ts` | Color/tipografía/espaciado. Fuente de verdad. | ✅ |
| 01 Splash | `Splash` | Logo, spinner "Verificando carga", 2 CTAs. | ✅ |
| 02a Scan-Empty | `Scan` (empty) | Bottom sheet, animación de pulso, auto-stop 30 s. | ✅ |
| 02b Scan-Found | `Scan` (found) | Lista de dispositivos con conectar/desconectar. | ✅ |
| 02c Scan-Error | `Scan` (error) | "No se encontró", reintentar + ayuda. | ✅ |
| 03 Dashboard-Connected | `Dashboard` | Batería, grid patrones, modos de control. | ✅ |
| 03b Patterns-Extended | `PatternsAll` | Grid escalable por categorías (Constantes/Ondas/Ráfagas) + "Nuevo". | ✅ |
| 03c Multi-Device | `MultiDevice` | Varios dispositivos, intensidad por dispositivo. | ✅ |
| 04 Gesture-Control | `GestureControl` | **Pad táctil** → intensidad en tiempo real. reanimated + throttle BLE. | ✅ |
| 04b Gesture-MultiDevice | `GestureMultiDevice` | Pad asignando a varios dispositivos. | 🟡 |
| 05 Sound-Control | `SoundControl` | Waveform en vivo, sensibilidad, curva de respuesta. Micrófono. | ✅ |
| 06 Music-Control | `MusicControl` | Sincronía con música, visualización rítmica. | ✅ |
| 07a Room-Create-Host | `RoomCreate` | Crear sala, código de invitación y recuperación de sesión. | ✅ |
| 07b Room-Join | `RoomJoin` | Input de código y unión segura a la sala. | ✅ |
| 07c Room-HostPanel | `RoomHostPanel` | Panel en tiempo real; expulsar/bloquear. | ✅ |
| 07c2 Room-BlockConfirm | `RoomHostPanel` (modal) | Confirmación destructiva de bloqueo. | ✅ |
| 07d Room-EndSession | `RoomHostPanel` (modal) | "Terminar sesión para todos". | ✅ |
| 07e Room-MemberSession | `RoomMemberSession` | Vista de invitado y controles P2P. | ✅ (pendiente validación física P2P) |
| 07f Room-Kicked | `RoomKicked` | "Has sido expulsado/bloqueado" + volver. | ✅ |
| 07g Room-Camera | `RoomCamera` | Video en sala (WebRTC). Badge de privacidad. | 🟡 |
| 08 Settings-Device | `SettingsDevice` | Firmware, desconectar, olvidar, soporte. | 🟡 |
| 09a State-Reconnecting | overlay | Spinner + "Reconectando…" + botón Reconectar visible. | 🟡 |
| 09b State-LowBattery | banner | Aviso batería baja. | 🟡 |
| 09c State-ConnectionError | overlay | Error de conexión accionable. | 🟡 |
| 10 Tokens-Dark | `darkTheme` | Variante oscura (P669 dominante). | ✅ (tokens) |
| 10a Splash-Dark | `Splash` (dark) | | 🟡 |
| 10b Multi-Device-Dark | `MultiDevice` (dark) | | 🟡 |
| 10c Room-Camera-Dark | `RoomCamera` (dark) | | 🟡 |

**Regla de fidelidad:** cada pantalla debe replicar el layout del frame correspondiente del `.dc.html`. Abrir el HTML de referencia en el navegador y calcar medidas/colores desde los tokens (no del pixel a ojo).
