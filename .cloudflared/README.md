# Cloudflare Tunnel Configuration

## Tunnel Info
- **Name**: certilog
- **ID**: 1cda938f-882c-4c94-9613-ac2df8d88ac4
- **Domains**:
  - Dashboard: https://certilog.starkmind.dev
  - API: https://api.certilog.starkmind.dev

## Requisitos DNS en Cloudflare

Configura estos registros CNAME en tu zona DNS de Cloudflare (starkmind.dev):

| Tipo | Nombre | Contenido |
|------|--------|-----------|
| CNAME | certilog | 1cda938f-882c-4c94-9613-ac2df8d88ac4.cfargotunnel.com |
| CNAME | api | 1cda938f-882c-4c94-9613-ac2df8d88ac4.cfargotunnel.com |

## Configuración del Túnel

El archivo `config.yml` está configurado para apuntar a:
- `certilog.starkmind.dev` → localhost:3000 (Dashboard)
- `api.certilog.starkmind.dev` → localhost:3001 (API)

## Uso

### Opción 1: Usar systemd (Recomendado)

```bash
# Desplegar todo (compilar e iniciar servicios)
sudo /root/proyectos/certilog-app/scripts/deploy.sh

# Verificar estado
sudo systemctl status certilog-api
sudo systemctl status certilog-dashboard
sudo systemctl status certilog-tunnel

# Ver logs
sudo journalctl -u certilog-api -f
sudo journalctl -u certilog-tunnel -f
```

### Opción 2: Iniciar manualmente

```bash
# 1. Iniciar API
cd /root/proyectos/certilog-app/apps/api
npm run build
npm start

# 2. Iniciar Dashboard (en otra terminal)
cd /root/proyectos/certilog-app/apps/dashboard
npm start

# 3. Iniciar Tunnel (en otra terminal)
/root/proyectos/certilog-app/scripts/start-tunnel.sh
```

## Troubleshooting

### Verificar si el túnel está activo
```bash
cloudflared tunnel info certilog
```

### Ver logs del túnel
```bash
cloudflared tunnel tail certilog
```

### Reiniciar solo el túnel
```bash
sudo systemctl restart certilog-tunnel
```

### Verificar que los servicios locales están corriendo
```bash
ss -tlnp | grep -E "(3000|3001)"
```
