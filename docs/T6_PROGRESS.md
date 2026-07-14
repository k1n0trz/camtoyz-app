# T6 — Control por sonido

## Implementado

- Control por sonido con permiso explícito de micrófono y procesamiento local.
- Un solo botón activa medición y respuesta del dispositivo.
- Perfiles calibrados para HyperBullet: Suave, Media y Alta.
- Parada de seguridad independiente 700 ms después del último sonido detectado.
- Parada por desenfoque, salida de pantalla y botón Detener.

## Validado en Galaxy S22+ / HyperBullet

- Permiso de micrófono y lectura de nivel de audio.
- Ruta completa audio → BLE → vibración.
- Activación con un toque y parada automática.
- Perfiles recalibrados usando respuesta física del dispositivo.

## Pendiente de T6

- Repetir la comparación final de perfiles con la última calibración de Suave.
- Diseñar e implementar el control musical como subfunción posterior.
