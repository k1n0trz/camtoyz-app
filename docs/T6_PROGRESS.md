# T6 — Control por sonido y música

## Implementado

- Control por sonido con permiso explícito de micrófono y procesamiento local.
- Un solo botón activa medición y respuesta del dispositivo.
- Perfiles calibrados para HyperBullet: Suave, Media y Alta.
- Parada de seguridad independiente 700 ms después del último sonido detectado.
- Parada por desenfoque, salida de pantalla y botón Detener.
- Dos fuentes musicales: audio interno de otra app y archivos guardados en el teléfono.
- Selector nativo de archivos y reproducción/análisis local sin subir el audio.
- Deslizador de intensidad máxima de 0 a 100%.
- Detector adaptativo de graves con pulsos BLE serializados, pausas y watchdog de silencio.

## Validado en Galaxy S22+ / HyperBullet

- Permiso de micrófono y lectura de nivel de audio.
- Ruta completa audio → BLE → vibración.
- Activación con un toque y parada automática.
- Perfiles recalibrados usando respuesta física del dispositivo.
- Captura de audio interno validada con Spotify.
- Archivo local validado con una pista controlada: 15 de 16 golpes detectados.
- Intensidad musical variable validada aproximadamente entre 38% y 80%.
- Pausa/final de reproducción validados con parada BLE doble y sin vibración sostenida.

## Compatibilidad conocida

- La captura externa depende de la política de captura de cada aplicación Android.
- Spotify quedó validado; si una app bloquea la captura, se usa la fuente local.

## Estado

T6 completado y validado físicamente el 2026-07-14.
