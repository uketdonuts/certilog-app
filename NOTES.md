# Certilog - Notas y Cambios

## 2026-02-01: Configuración Cloudflare Tunnel

### Resumen
Se configuró el acceso a Certilog mediante Cloudflare Tunnel con los siguientes endpoints:
- **Dashboard:** https://certilog.starkmind.dev
- **API:** https://api.certilog.starkmind.dev

### Cambios Realizados

#### 1. Archivos de Configuración del Túnel
- **`.cloudflared/config.yml`**: Configuración de rutas del túnel
  - `certilog.starkmind.dev` → `localhost:3000` (Dashboard)
  - `api.certilog.starkmind.dev` → `localhost:3001` (API)

- **`.cloudflared/1cda938f-882c-4c94-9613-ac2df8d88ac4.json`**: Credenciales del túnel (almacenado en `/root/.cloudflared/`)

- **`.cloudflared/README.md`**: Documentación del túnel

#### 2. Servicios Systemd Creados
- `/etc/systemd/system/certilog-api.service`: Servicio de la API Node.js
- `/etc/systemd/system/certilog-dashboard.service`: Servicio del Dashboard Next.js
- `/etc/systemd/system/certilog-tunnel.service`: Servicio del Cloudflare Tunnel

#### 3. Scripts de Despliegue
- `scripts/deploy.sh`: Script principal de despliegue (compila, configura y reinicia servicios)
- `scripts/start-tunnel.sh`: Inicia el túnel manualmente
- `scripts/start-services.sh`: Inicia API y Dashboard manualmente

#### 4. Configuración de Variables de Entorno
- `apps/dashboard/.env.local`: Actualizado con URLs del tunnel
  ```
  NEXT_PUBLIC_API_URL=https://api.certilog.starkmind.dev
  NEXT_PUBLIC_SOCKET_URL=https://api.certilog.starkmind.dev
  ```

#### 5. Corrección de Errores
- **API (`apps/api/src/controllers/repair.controller.ts`)**: Corregido error de TypeScript donde `req.params.id` se casteó a `String()` para evitar conflicto de tipos con Prisma.

#### 6. Archivos Eliminados
- Eliminados archivos Docker obsoletos:
  - `docker-compose.yml`
  - `.env` (Docker)
  - `scripts/deploy-cloudflared.sh`

### Información del Túnel

```
Nombre: certilog
ID: 1cda938f-882c-4c94-9613-ac2df8d88ac4
Estado: Conectado
Connector ID: d4d0d2a1-a28a-49f2-9a71-1dc4184dd187
IP de Origen: 64.23.184.245
```

### Completado ✅
- [x] Configurar registros DNS CNAME en Cloudflare para `certilog.starkmind.dev` y `api.certilog.starkmind.dev`
  - Registro: `certilog` → `1cda938f-882c-4c94-9613-ac2df8d88ac4.cfargotunnel.com`
  - Registro: `api.certilog` → `1cda938f-882c-4c94-9613-ac2df8d88ac4.cfargotunnel.com`

### URLs de Acceso
- 🖥️ **Dashboard**: https://certilog.starkmind.dev
- 🔌 **API**: https://api.certilog.starkmind.dev

### Corrección Mixed Content (2026-02-01)
**Problema:** El dashboard hacía peticiones HTTP a `http://64.23.184.245:3001` desde una página HTTPS, causando errores de "Mixed Content".

**Solución:** Recompilación del dashboard con variables de entorno correctas:
```bash
# Detener servicio
sudo systemctl stop certilog-dashboard

# Limpiar build anterior
rm -rf apps/dashboard/.next

# Recompilar con nuevas variables
cd apps/dashboard && npm run build

# Reiniciar servicio
sudo systemctl start certilog-dashboard
```

### Solución SSL - Path-based Routing (2026-02-01)
**Problema:** Error `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` al hacer requests a `api.certilog.starkmind.dev`.

**Causa:** Cloudflare no presentaba certificado SSL válido para el subdominio `api.certilog`.

**Solución aplicada:** Cambio a path-based routing con un solo dominio:
- Antes: `https://api.certilog.starkmind.dev/api/*`
- Después: `https://certilog.starkmind.dev/api/*`

**Cambios realizados:**
1. Actualizado `.cloudflared/config.yml` para usar path-based routing
2. Actualizado `apps/dashboard/.env.local` con nueva URL de API
3. Recompilado dashboard con nuevas variables
4. Reiniciados servicios

**Configuración del túnel actual:**
```yaml
ingress:
  # API - rutas /api/*
  - hostname: certilog.starkmind.dev
    path: ^/api(/.*)?$
    service: http://localhost:3001
  
  # Dashboard - todo lo demás
  - hostname: certilog.starkmind.dev
    service: http://localhost:3000
```

**URLs finales:**
- Dashboard: https://certilog.starkmind.dev
- API: https://certilog.starkmind.dev/api/*

### Actualización App Mobile (2026-02-01)
**Cambio:** Actualización de URLs de API en configuración de builds.

**Archivo:** `apps/mobile/eas.json`

**Cambios:**
- Preview: `http://64.23.184.245:2120` → `https://certilog.starkmind.dev`
- Production: `https://certilog.com.pa/api` → `https://certilog.starkmind.dev`
- Production-APK: `https://certilog.com.pa/api` → `https://certilog.starkmind.dev`

**Nota:** Las variables `EXPO_PUBLIC_API_URL` y `EXPO_PUBLIC_SOCKET_URL` apuntan al dominio raíz porque las peticiones en el código incluyen `/api/` en las rutas.

### Comandos Útiles

```bash
# Desplegar completamente
sudo /root/proyectos/certilog-app/scripts/deploy.sh

# Ver estado
sudo systemctl status certilog-api certilog-dashboard certilog-tunnel

# Ver logs
sudo journalctl -u certilog-tunnel -f

# Info del túnel
cloudflared tunnel info certilog
```

---

## Estructura de Servicios

```
┌─────────────────────────────────────────────────────────────┐
│                        Cloudflare                           │
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │ certilog.starkmind  │    │ api.certilog.stark  │        │
│  │ .dev                │    │ mind.dev            │        │
│  └──────────┬──────────┘    └──────────┬──────────┘        │
│             │                          │                    │
│             └──────────┬───────────────┘                    │
│                        │                                     │
│              Cloudflare Tunnel                              │
│         (1cda938f-882c-4c94-9613-ac2df8d88ac4)             │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
       localhost:3000          localhost:3001
              │                     │
        ┌─────┴─────┐          ┌────┴────┐
        │ Dashboard │          │   API   │
        │ (Next.js) │          │(Express)│
        └───────────┘          └─────────┘
```
