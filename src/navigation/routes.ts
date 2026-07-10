/**
 * Inventario completo de pantallas — derivado 1:1 del sistema de diseño (28 frames).
 * Cada frame del .dc.html mapea a una ruta o a un estado/variante de una ruta.
 * Codex: usar esta tabla como contrato. No inventar rutas fuera de aquí sin actualizar el diseño.
 */

export type RootStackParamList = {
  Splash: undefined; // 01 Splash
  Scan: undefined; // 02a/02b/02c — sheet con estados empty|found|error
  Dashboard: undefined; // 03 Dashboard-Connected
  PatternsAll: undefined; // 03b Patterns-Extended (grid por categorías)
  MultiDevice: undefined; // 03c Multi-Device
  GestureControl: undefined; // 04 Gesture-Control (pad de dibujo)
  GestureMultiDevice: undefined; // 04b Gesture-MultiDevice
  SoundControl: undefined; // 05 Sound-Control
  MusicControl: undefined; // 06 Music-Control
  RoomCreate: undefined; // 07a Room-Create-Host
  RoomJoin: undefined; // 07b Room-Join
  RoomHostPanel: undefined; // 07c Room-HostPanel (+ 07c2 BlockConfirm, 07d EndSession)
  RoomMemberSession: undefined; // 07e Room-MemberSession
  RoomKicked: undefined; // 07f Room-Kicked
  RoomCamera: undefined; // 07g Room-Camera (video en sala)
  SettingsDevice: undefined; // 08 Settings-Device
};

/** Estados transversales (no son rutas; se renderizan como overlay/inline). Ver 09a/09b/09c. */
export const SYSTEM_STATES = ['reconnecting', 'lowBattery', 'connectionError'] as const;
export type SystemState = (typeof SYSTEM_STATES)[number];

/** Mapa frame de diseño -> ruta/estado, para trazabilidad en el handoff a Codex. */
export const DESIGN_FRAME_MAP: Record<string, string> = {
  '00 Tokens': 'src/theme/tokens.ts',
  '01 Splash': 'Splash',
  '02a Scan-Empty': 'Scan (state=empty)',
  '02b Scan-Found': 'Scan (state=found)',
  '02c Scan-Error': 'Scan (state=error)',
  '03 Dashboard-Connected': 'Dashboard',
  '03b Patterns-Extended': 'PatternsAll',
  '03c Multi-Device': 'MultiDevice',
  '04 Gesture-Control': 'GestureControl',
  '04b Gesture-MultiDevice': 'GestureMultiDevice',
  '05 Sound-Control': 'SoundControl',
  '06 Music-Control': 'MusicControl',
  '07a Room-Create-Host': 'RoomCreate',
  '07b Room-Join': 'RoomJoin',
  '07c Room-HostPanel': 'RoomHostPanel',
  '07c2 Room-BlockConfirm': 'RoomHostPanel (modal blockConfirm)',
  '07d Room-EndSession': 'RoomHostPanel (modal endSession)',
  '07e Room-MemberSession': 'RoomMemberSession',
  '07f Room-Kicked': 'RoomKicked',
  '07g Room-Camera': 'RoomCamera',
  '08 Settings-Device': 'SettingsDevice',
  '09a State-Reconnecting': 'SystemState=reconnecting (overlay)',
  '09b State-LowBattery': 'SystemState=lowBattery (banner)',
  '09c State-ConnectionError': 'SystemState=connectionError (overlay)',
  '10 Tokens-Dark': 'darkTheme',
  '10a Splash-Dark': 'Splash (dark)',
  '10b Multi-Device-Dark': 'MultiDevice (dark)',
  '10c Room-Camera-Dark': 'RoomCamera (dark)',
};
