# Camtoyz App

Aplicación móvil de control Bluetooth Low Energy (BLE) para dispositivos **Camtoyz**. Sustituye la aplicación legacy con una sesión BLE estable, controles gestuales, respuesta a sonido y música, e interacción remota por salas.

- **Stack móvil:** React Native + TypeScript sobre Expo (bare/dev-client).
- **Servidor de salas:** Node.js + Socket.IO, con contratos TypeScript compartidos.
- **Diseño:** sistema de 28 pantallas en `design/reference/`, con tokens rosa/lila y sin rojo.
- **Estado:** Fases 0–5 terminadas y validadas en hardware; Fase 6 (salas remotas) en desarrollo.

## Capacidades implementadas

1. Sesión BLE centralizada con escaneo, conexión y recuperación.
2. Patrones de vibración escalables y control de intensidad.
3. Control gestual de baja latencia.
4. Control por micrófono con sensibilidades diferenciadas.
5. Sincronización musical desde audio externo o un archivo local.
6. Base segura del servidor de salas: membresía, roles, moderación y señalización WebRTC.

## Estructura

```text
App.tsx                    Entrada y navegación
src/
  theme/                   Tokens de diseño
  navigation/              Rutas e inventario de pantallas
  ble/                     Protocolo y sesión BLE
  screens/                 Pantallas de la aplicación
  components/              Componentes compartidos
  state/                   Estado global con Zustand
shared/roomProtocol.ts     Contrato tipado cliente-servidor de salas
server/                    Servidor de membresía y señalización
design/reference/          Especificación visual aprobada
assets/                    Recursos de marca e iconos
docs/                      Roadmap, arquitectura, pruebas y decisiones
data/                      Material de referencia legacy
```

## Desarrollo móvil

Requiere Node.js 20+, Android Studio y un teléfono Android con depuración USB o un emulador. En Windows, iOS requiere compilación remota.

```bash
npm install
npx expo install
npx expo prebuild
npm run android
```

## Servidor de salas

```bash
npm run server:test
npm run server:build
npm run server:start
```

Consulta `server/README.md` para la configuración y `docs/T7_PROGRESS.md` para el estado de la Fase 6.
