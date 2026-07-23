# Camtoyz App 0.9.1 — corrección interna

## Motivo

La APK 0.9.0 compilada localmente no recibió `EXPO_PUBLIC_ROOM_SERVER_URL` y podía resolver el servidor de salas como `127.0.0.1:8787`, es decir, el propio teléfono.

## Corrección

- Toda compilación instalada (`__DEV__ === false`) usa obligatoriamente `https://app.camtoyz.com`.
- El host local de Metro se conserva únicamente para desarrollo.
- `app.json`, EAS y el código comparten el mismo endpoint público.
- CI comprueba que las tres configuraciones no diverjan.
- Versión Android: `0.9.1` / `versionCode 10`.

## Artefacto

- Archivo: `releases/Camtoyz-App-0.9.1-internal.apk` (ignorado por Git).
- Tamaño: 139.361.509 bytes.
- SHA-256: `66EAB3E318D2CD593C91B33AD537E4BA693EE5A57C4DA2FCA0E898A708639682`.
- Paquete: `com.camtoyz.app`.
- Versión: `0.9.1` / `versionCode 10`.
- Firma: certificado interno de pruebas compatible con las instalaciones 0.3.0 y 0.9.0.
- Bundle verificado: contiene `https://app.camtoyz.com` y no contiene `127.0.0.1:8787`.
- Validación física: actualización instalada en el Galaxy, inicio sin excepción fatal y entrada exitosa desde la APK a una sala pública real como miembro.
