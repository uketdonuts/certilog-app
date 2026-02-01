# Plan de Desarrollo: Fix ERR_SSL_VERSION_OR_CIPHER_MISMATCH

## 🔴 Problema Actual
Error SSL al conectar con `api.certilog.starkmind.dev`
- Handshake SSL falla entre navegador y Cloudflare
- El túnel está funcionando correctamente
- La API responde localmente en puerto 3001

## 📊 Diagnóstico Realizado

### ✅ Componentes que funcionan:
1. Túnel cloudflared: Conectado y activo
2. API local: Responde en localhost:3001
3. Dashboard local: Responde en localhost:3000
4. DNS: Registros CNAME configurados

### ❌ Problema identificado:
Cloudflare no está presentando certificado SSL válido para `api.certilog.starkmind.dev`
```
openssl s_client -connect api.certilog.starkmind.dev:443
# Result: no peer certificate available
```

---

## 🎯 Plan de Acción

### Fase 1: Verificar Configuración Cloudflare SSL (Prioridad Alta)

**Acción 1.1:** Confirmar modo SSL/TLS
- URL: https://dash.cloudflare.com → starkmind.dev → SSL/TLS → Overview
- Verificar que muestre: **"Full (strict)"** o **"Full"**
- Si está en "Flexible" → Cambiar inmediatamente

**Acción 1.2:** Verificar Edge Certificates
- URL: SSL/TLS → Edge Certificates
- Confirmar que exista certificado para:
  - `*.starkmind.dev` (wildcard)
  - O certificados individuales para subdominios

**Acción 1.3:** Configurar Minimum TLS Version
- URL: SSL/TLS → Edge Certificates → Minimum TLS Version
- Seleccionar: **1.0** (máxima compatibilidad)
- O probar con **1.2** después

**Acción 1.4:** Desactivar TLS 1.3
- URL: SSL/TLS → Edge Certificates
- TLS 1.3: **OFF**

---

### Fase 2: Alternativa - Path-based Routing (Si Fase 1 falla)

**Problema:** Dos subdominios (`certilog` y `api.certilog`) pueden tener conflictos de certificado.

**Solución alternativa:** Usar un solo hostname con rutas:
- `certilog.starkmind.dev` → Dashboard
- `certilog.starkmind.dev/api/*` → API

**Implementación:**

```yaml
# .cloudflared/config.yml modificado
ingress:
  # API backend - rutas /api/*
  - hostname: certilog.starkmind.dev
    path: ^/api/.*
    service: http://localhost:3001
    originRequest:
      noTLSVerify: true
  
  # Dashboard frontend - todo lo demás
  - hostname: certilog.starkmind.dev
    service: http://localhost:3000
    originRequest:
      noTLSVerify: true
  
  - service: http_status:404
```

**Ventajas:**
- Un solo certificado SSL para `certilog.starkmind.dev`
- CORS más simple (mismo origen)
- Menos configuración DNS

---

### Fase 3: Configurar CORS en API

Si usamos dominios separados, la API debe aceptar CORS:

```typescript
// apps/api/src/index.ts o donde se configure CORS
app.use(cors({
  origin: [
    'https://certilog.starkmind.dev',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

### Fase 4: Verificación Final

**Tests a realizar:**

```bash
# 1. Verificar SSL handshake
openssl s_client -connect certilog.starkmind.dev:443 -servername certilog.starkmind.dev

# 2. Test de API
curl -X POST https://api.certilog.starkmind.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  -v

# 3. Test de login desde dashboard
# Abrir navegador → DevTools → Network → Intentar login
```

---

## 🚀 Implementación Inmediata (Script)

```bash
#!/bin/bash
# scripts/fix-ssl.sh

echo "=== FASE 2: Path-based Routing ==="

# Backup de configuración actual
cp /root/proyectos/certilog-app/.cloudflared/config.yml \
   /root/proyectos/certilog-app/.cloudflared/config.yml.backup

# Nueva configuración con path-based routing
cat > /root/proyectos/certilog-app/.cloudflared/config.yml << 'EOF'
tunnel: 1cda938f-882c-4c94-9613-ac2df8d88ac4
credentials-file: /root/.cloudflared/1cda938f-882c-4c94-9613-ac2df8d88ac4.json

ingress:
  # API - todas las rutas que empiezan con /api/
  - hostname: certilog.starkmind.dev
    path: ^/api(/.*)?$
    service: http://localhost:3001
  
  # Dashboard - todo lo demás
  - hostname: certilog.starkmind.dev
    service: http://localhost:3000
  
  # Default fallback
  - service: http_status:404
EOF

# Actualizar variables de entorno del dashboard
cat > /root/proyectos/certilog-app/apps/dashboard/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://certilog.starkmind.dev
NEXT_PUBLIC_SOCKET_URL=https://certilog.starkmind.dev
NEXT_PUBLIC_MAPBOX_TOKEN=
EOF

echo "=== Recompilando dashboard ==="
cd /root/proyectos/certilog-app/apps/dashboard
rm -rf .next
npm run build

echo "=== Reiniciando servicios ==="
systemctl restart certilog-tunnel
systemctl restart certilog-dashboard
sleep 3

echo "=== Verificación ==="
curl -s -o /dev/null -w "Dashboard: %{http_code}\n" https://certilog.starkmind.dev/
curl -s -o /dev/null -w "API Health: %{http_code}\n" https://certilog.starkmind.dev/api/health
curl -s -o /dev/null -w "API Login: %{http_code}\n" -X POST https://certilog.starkmind.dev/api/auth/login

echo "✅ Configuración completada"
echo "URL única: https://certilog.starkmind.dev"
```

---

## 📋 Checklist de Verificación Cloudflare

Antes de implementar, verificar en Cloudflare:

- [ ] SSL/TLS Mode: **Full** o **Full (strict)**
- [ ] Always Use HTTPS: **ON**
- [ ] Minimum TLS Version: **1.0** o **1.2**
- [ ] TLS 1.3: **OFF** (para testing)
- [ ] Automatic HTTPS Rewrites: **ON** (opcional)
- [ ] Certificado válido para `*.starkmind.dev`

---

## 🔧 Si nada funciona - Debug Avanzado

```bash
# Ver logs detallados de cloudflared
journalctl -u certilog-tunnel -f &

# Test con curl detallado
curl -v https://api.certilog.starkmind.dev/api/health 2>&1

# Verificar cipher suites soportados
nmap --script ssl-enum-ciphers -p 443 api.certilog.starkmind.dev
```
