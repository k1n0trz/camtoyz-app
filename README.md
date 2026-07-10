# Camtoyz Control

App de control remoto Bluetooth (BLE) para juguetes íntimos **Camtoyz**. Reemplazo propio y mejorado de la app *OmniRemote*, que ya funciona con el hardware pero tiene defectos de conectividad y funcionalidad.

- **Stack:** React Native + TypeScript sobre Expo (bare / dev-client).
- **Diseño:** sistema de 28 pantallas aprobado en Claude Design (paleta rosa/lila Pantone, sin rojo). Ver `design/reference/`.
- **Estado:** base scaffold. Pensado para continuar la implementación con **Codex** siguiendo `docs/`.

## Objetivos de esta versión (vs OmniRemote)

1. **Conectividad estable** — auto-reconexión + MTU + sesión BLE centralizada (defecto #1). Ver `src/ble/BleManager.ts`.
2. **Patrones de vibración escalables** — grid que crece sin romperse; más de 5 niveles, organizables por categoría.
3. **Control por gesto ("lápiz vibrador")** — pad táctil de alta frecuencia → intensidad en tiempo real.
4. **Afinar control por sonido y musical** — curva de respuesta, no solo umbral.
5. **Interacción remota (salas)** — control P2P + servidor ligero de membresía con roles (anfitrión/miembro), expulsar/bloquear.

## Se conserva de OmniRemote
- Indicador de batería del dispositivo en el dashboard.
- Flujo de descubrimiento/conexión BLE.
- Estética minimalista.

## Estructura

```
App.tsx                 Entry + navegación
src/
  theme/                Design tokens (fuente de verdad de color/tipografía) 
  navigation/routes.ts  Inventario de 28 pantallas -> rutas (contrato con el diseño)
  ble/                  Protocolo (UUID del APK) + BleManager (sesión robusta)
  screens/              Pantallas (Splash y Dashboard como patrón; resto por construir)
  components/           Componentes compartidos (Logo, ...)
  state/                Estado global (zustand) — por crear
  features/room/        Salas P2P — Fase 5
design/reference/       Export del diseño de Claude Design (spec visual)
assets/logo/            Wordmark Camtoyz en variantes de color
docs/                   Roadmap, arquitectura, plan y prompt para Codex, protocolo BLE
data/                   Referencia: APK legacy + capturas + brand kit
```

## Arranque (para el toolchain nativo)

> Requiere Node 18+, y para compilar el dev-client: Android Studio (SDK + un emulador o teléfono en modo depuración). En Windows, iOS requiere EAS Build en la nube.

```bash
npm install
npx expo install            # alinea versiones de módulos nativos
npx expo prebuild           # genera android/ (e ios/)
npm run android             # compila e instala el dev-client en el teléfono conectado
```

Ver `docs/CODEX_INITIAL_PROMPT.md` para el punto de arranque de la implementación.
