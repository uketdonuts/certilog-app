# Certilog - Registro de Errores y Soluciones

## Errores Recientes

### 2026-02-01: DNS_PROBE_POSSIBLE - Site can't be reached

**Síntoma:**
```
This site can't be reached
certilog.starkmind.dev's DNS address could not be found. Diagnosing the problem.
DNS_PROBE_POSSIBLE
```

**Causa:**
Los registros DNS CNAME no han sido configurados en el panel de Cloudflare para el dominio `starkmind.dev`.

**Solución:**
1. Acceder al panel de Cloudflare (https://dash.cloudflare.com)
2. Seleccionar la zona `starkmind.dev`
3. Ir a DNS → Records
4. Agregar los siguientes registros CNAME:

| Tipo | Nombre | Contenido | Proxy Status |
|------|--------|-----------|--------------|
| CNAME | `certilog` | `1cda938f-882c-4c94-9613-ac2df8d88ac4.cfargotunnel.com` | Proxied (naranja) |
| CNAME | `api` | `1cda938f-882c-4c94-9613-ac2df8d88ac4.cfargotunnel.com` | Proxied (naranja) |

**Verificación:**
```bash
# Verificar que el túnel está conectado
cloudflared tunnel info certilog

# Verificar resolución DNS (después de configurar)
nslookup certilog.starkmind.dev
nslookup api.certilog.starkmind.dev
```

---

### 2026-02-01: EADDRINUSE - Puerto 3000 ocupado

**Síntoma:**
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:3000
```

**Causa:**
Existía un proceso anterior de Next.js ocupando el puerto 3000.

**Solución:**
```bash
# Encontrar y matar el proceso
sudo lsof -ti:3000 | xargs kill -9

# O usando ss
sudo kill $(ss -tlnp | grep :3000 | grep -oP 'pid=\K[0-9]+')

# Reiniciar el servicio
sudo systemctl restart certilog-dashboard
```

---

### 2026-02-01: TypeScript compilation errors

**Síntoma:**
```
src/controllers/repair.controller.ts(69,16): error TS2322: Type 'string | string[]' is not assignable to type 'string'
```

**Causa:**
El tipo de `req.params.id` puede ser `string | string[]` pero Prisma espera solo `string`.

**Solución:**
```typescript
// Antes:
const { id } = req.params;

// Después:
const id = String(req.params.id);
```

---

### 2026-02-01: App Mobile apuntando a IP antigua

**Síntoma:**
La app mobile (Expo/React Native) estaba configurada para apuntar a la IP antigua del servidor:
```
EXPO_PUBLIC_API_URL: http://64.23.184.245:2120
```

**Impacto:**
- Las builds de preview usaban la IP antigua
- Las builds de producción apuntaban a dominio diferente (`certilog.com.pa`)

**Solución:**
Actualización de `apps/mobile/eas.json`:
```json
{
  "preview": {
    "env": {
      "EXPO_PUBLIC_API_URL": "https://certilog.starkmind.dev",
      "EXPO_PUBLIC_SOCKET_URL": "https://certilog.starkmind.dev"
    }
  },
  "production": {
    "env": {
      "EXPO_PUBLIC_API_URL": "https://certilog.starkmind.dev",
      "EXPO_PUBLIC_SOCKET_URL": "https://certilog.starkmind.dev"
    }
  }
}
```

**Nota:** Para aplicar los cambios se debe reconstruir la app:
```bash
cd apps/mobile
eas build --profile preview --platform android
```

---

### 2026-02-01: ERR_SSL_VERSION_OR_CIPHER_MISMATCH - RESUELTO ✅

**Síntoma:**
```
POST https://api.certilog.starkmind.dev/api/auth/login net::ERR_SSL_VERSION_OR_CIPHER_MISMATCH
```

**Causa raíz:**
Cloudflare no presentaba certificado SSL válido para el subdominio `api.certilog.starkmind.dev`.

**Solución aplicada:**
Se migró a **path-based routing** usando un solo dominio:

1. **Configuración anterior (problemática):**
   - `certilog.starkmind.dev` → Dashboard
   - `api.certilog.starkmind.dev` → API ❌ (sin certificado)

2. **Configuración nueva (funcional):**
   - `certilog.starkmind.dev` → Dashboard
   - `certilog.starkmind.dev/api/*` → API ✅

**Implementación:**
```bash
# Ejecutar script de fix
/root/proyectos/certilog-app/scripts/fix-ssl.sh
```

**Archivos modificados:**
- `.cloudflared/config.yml` - Path-based routing
- `apps/dashboard/.env.local` - URL unificada
- `apps/dashboard/` - Recompilado con nuevas variables

**URLs finales:**
- Dashboard: https://certilog.starkmind.dev
- API: https://certilog.starkmind.dev/api/*

---

### 2026-02-01: ERR_SSL_VERSION_OR_CIPHER_MISMATCH

**Síntoma:**
```
POST https://api.certilog.starkmind.dev/api/auth/login net::ERR_SSL_VERSION_OR_CIPHER_MISMATCH
```

**Causa:**
Configuración incorrecta del modo SSL/TLS en Cloudflare o conflicto entre certificados.

**Solución:**

1. **Acceder a Cloudflare**: https://dash.cloudflare.com → starkmind.dev
2. **Ir a**: SSL/TLS → Overview
3. **Configurar modo SSL**: Seleccionar **"Full (strict)"** o **"Full"**
   - ❌ No uses "Flexible" (causa loops de redirección)
   - ✅ "Full": Encripta entre Cloudflare y tu servidor
   - ✅ "Full (strict)": Encripta y valida el certificado

4. **Verificar Edge Certificates**:
   - SSL/TLS → Edge Certificates
   - Asegurar que "Always Use HTTPS" esté **ON**

5. **Configurar Minimum TLS Version**:
   - SSL/TLS → Edge Certificates → Minimum TLS Version
   - Seleccionar: **TLS 1.2** o **TLS 1.0** (para compatibilidad)

6. **Desactivar TLS 1.3** (si causa problemas):
   - SSL/TLS → Edge Certificates
   - Desactivar "TLS 1.3" temporalmente para testing

**Verificación:**
```bash
# Test de SSL
curl -I -v https://api.certilog.starkmind.dev 2>&1 | grep -E "(SSL|TLS|handshake)"

# Test de conectividad
curl -s https://api.certilog.starkmind.dev/
```

---

## Troubleshooting General

### Verificar estado de servicios
```bash
sudo systemctl status certilog-api certilog-dashboard certilog-tunnel
```

### Ver logs en tiempo real
```bash
sudo journalctl -u certilog-api -f
sudo journalctl -u certilog-dashboard -f
sudo journalctl -u certilog-tunnel -f
```

### Verificar puertos
```bash
sudo ss -tlnp | grep -E "(3000|3001)"
```

### Reiniciar todo
```bash
sudo /root/proyectos/certilog-app/scripts/deploy.sh
```
