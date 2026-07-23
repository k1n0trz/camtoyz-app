# Infraestructura de salas

Estado auditado el 15 de julio de 2026.

## Producción interna

- Proyecto Google Cloud: `camtoyz-control-20260714`.
- VM: `camtoyz-room-1`, `e2-medium`, zona `us-east1-b`.
- IP pública: `35.237.39.124`.
- Dominio: `https://app.camtoyz.com`.
- Disco: 30 GB `pd-balanced` con Ubuntu 24.04 LTS.
- Procesos: servidor de salas, Caddy y Coturn en contenedores con reinicio `unless-stopped`.
- Salud pública: `GET /health` responde únicamente estado y número de salas activas.
- Las salas son efímeras y la VM única es un punto de falla aceptado para las pruebas internas.

## Red

- HTTP/HTTPS: TCP 80/443.
- TURN: TCP/UDP 3478.
- Relays TURN: TCP/UDP 49160–49200.
- SSH público y RDP público están desactivados.
- Administración SSH: exclusivamente mediante Google Cloud IAP desde `35.235.240.0/20` y la etiqueta `camtoyz-rooms`.

Acceso administrativo:

```powershell
gcloud compute ssh camtoyz-room-1 --zone us-east1-b --tunnel-through-iap
```

## Comprobaciones rápidas

```powershell
Invoke-RestMethod https://app.camtoyz.com/health
gcloud compute instances list
gcloud compute ssh camtoyz-room-1 --zone us-east1-b --tunnel-through-iap --command="sudo docker ps"
```

## Recuperación básica

1. Confirmar que la VM esté `RUNNING`.
2. Consultar `sudo docker ps` y `sudo docker compose ps` mediante IAP.
3. Reiniciar únicamente el servicio afectado con Docker Compose desde el directorio de despliegue de la VM.
4. Verificar `https://app.camtoyz.com/health` y realizar una prueba de sala con dos redes.
5. Si falla la VM completa, restaurar el último snapshot de disco disponible o recrear la VM y desplegar el Compose documentado; conservar la misma IP/DNS.

No se deben copiar al repositorio los secretos TURN, archivos `.env`, llaves SSH ni almacenes de firma Android.
