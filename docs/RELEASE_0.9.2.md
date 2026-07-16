# Camtoyz App 0.9.2 — candidata interna

## Cambios principales

- Control simultáneo de juguetes con múltiples motores, detectado desde las capacidades BLE.
- Cada motor muestra su propio deslizador y conserva una intensidad diferente; se eliminó el selector «Ambos / Motor 1 / Motor 2».
- FlexiCurve validado con dos canales físicos independientes.
- Menor latencia entre los golpes musicales y los pulsos Bluetooth.
- La gráfica musical queda limpia, sin contadores técnicos visibles.
- Sala de cámara vertical con cámara local simultánea y controles de vibración superpuestos.
- Tema claro como experiencia principal y modo oscuro opcional, ambos persistentes.
- Selector rápido de tema disponible desde la pantalla inicial.
- Interfaz seleccionable en español o inglés.
- Flechas de retorno con área táctil amplia y destino seguro.
- El identificador Bluetooth del juguete ya no se muestra al usuario.
- El anfitrión conserva copia rápida del código de sala.

## Identificación Android

- Versión: `0.9.2`
- `versionCode`: `11`
- Paquete: `com.camtoyz.app`
- Servidor: `https://app.camtoyz.com`
- APK: `releases/Camtoyz-App-0.9.2-internal.apk` (ignorado por Git)
- Tamaño: `139.381.989` bytes
- SHA-256: `C420D0073844E069956A6803CFBC7FA4545B127436A7BD082E73958D52E3F105`
- Firma: mismo certificado interno usado por 0.9.0 y 0.9.1

## Validación pendiente

- Regresión manual completa en dos teléfonos y redes distintas.
- Contraste y textos residuales en modo oscuro/inglés.
- Prueba de ritmo musical con varias aplicaciones y estilos de música.
- Validación remota de ambos motores del FlexiCurve.
- Textos legales, correo de soporte y aprobación para promover a `1.0.0`.
