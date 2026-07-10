# T1 · Validación en Android físico

Fecha: 2026-07-10

## Entorno

- Dispositivo: Samsung Galaxy S22+ (`SM-S906E`)
- Android SDK: API 35 / Build Tools 35.0.0
- JDK: Temurin 17
- Variante: dev-client debug
- Package: `com.camtoyz.control`

## Resultado

- `npx expo install --check`: limpio.
- `npm run typecheck`: limpio.
- `npm run lint`: limpio.
- `gradlew assembleDebug`: exitoso.
- APK instalado mediante ADB.
- Bundle de Metro cargado correctamente.
- Navegación Splash → Dashboard verificada en el dispositivo.
- Sin errores JavaScript ni excepciones fatales en `logcat`.

## Evidencia

- [Splash en Galaxy S22+](screenshots/t1-splash-s22.png)
- [Dashboard en Galaxy S22+](screenshots/t1-dashboard-s22.png)

Las cifras de dispositivo, batería y patrones del Dashboard siguen siendo datos simulados. Su conexión a estado BLE real corresponde a T2.
