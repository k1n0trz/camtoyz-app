import { readFileSync } from 'node:fs';

const expectedUrl = 'https://app.camtoyz.com';
const appConfig = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
const easConfig = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
const roomConfig = readFileSync(
  new URL('../src/features/room/roomConfig.ts', import.meta.url),
  'utf8',
);

const configuredUrls = [
  ['app.json extra', appConfig.expo?.extra?.roomServerUrl],
  ['EAS preview', easConfig.build?.preview?.env?.EXPO_PUBLIC_ROOM_SERVER_URL],
  ['EAS production', easConfig.build?.production?.env?.EXPO_PUBLIC_ROOM_SERVER_URL],
];

for (const [label, value] of configuredUrls) {
  if (value !== expectedUrl) {
    throw new Error(`${label} debe apuntar a ${expectedUrl}; recibido: ${String(value)}`);
  }
}

if (!roomConfig.includes(`PRODUCTION_ROOM_SERVER_URL = '${expectedUrl}'`)) {
  throw new Error('roomConfig.ts no contiene el servidor público de producción esperado.');
}

if (!roomConfig.includes('if (!__DEV__) return PRODUCTION_ROOM_SERVER_URL;')) {
  throw new Error('La compilación instalada no tiene una salida obligatoria al servidor público.');
}

console.log(`Configuración release verificada: ${expectedUrl}`);
