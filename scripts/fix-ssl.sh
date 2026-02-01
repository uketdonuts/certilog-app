#!/bin/bash
set -e

echo "🔧 FIX SSL: Path-based Routing"
echo "================================"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd /root/proyectos/certilog-app

# ============================================
# FASE 1: Backup y Nueva Configuración
# ============================================
echo -e "${YELLOW}▶${NC} FASE 1: Configurando path-based routing..."

# Backup de configuración actual
if [ -f .cloudflared/config.yml ]; then
    cp .cloudflared/config.yml .cloudflared/config.yml.backup.$(date +%s)
    echo "  Backup creado: .cloudflared/config.yml.backup.*"
fi

# Nueva configuración con path-based routing
cat > .cloudflared/config.yml << 'EOF'
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

echo -e "${GREEN}✓${NC} Configuración del túnel actualizada"
echo ""

# ============================================
# FASE 2: Actualizar Variables de Entorno
# ============================================
echo -e "${YELLOW}▶${NC} FASE 2: Actualizando variables de entorno..."

cat > apps/dashboard/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://certilog.starkmind.dev
NEXT_PUBLIC_SOCKET_URL=https://certilog.starkmind.dev
NEXT_PUBLIC_MAPBOX_TOKEN=
EOF

echo -e "${GREEN}✓${NC} Variables actualizadas:"
echo "  NEXT_PUBLIC_API_URL=https://certilog.starkmind.dev"
echo ""

# ============================================
# FASE 3: Recompilar Dashboard
# ============================================
echo -e "${YELLOW}▶${NC} FASE 3: Recompilando dashboard..."

systemctl stop certilog-dashboard 2>/dev/null || true
sleep 2

cd apps/dashboard
rm -rf .next
npm run build 2>&1 | tail -20
cd ../..

echo -e "${GREEN}✓${NC} Dashboard recompilado"
echo ""

# ============================================
# FASE 4: Reiniciar Servicios
# ============================================
echo -e "${YELLOW}▶${NC} FASE 4: Reiniciando servicios..."

systemctl restart certilog-tunnel
systemctl restart certilog-dashboard

sleep 5

echo -e "${GREEN}✓${NC} Servicios reiniciados"
echo ""

# ============================================
# FASE 5: Verificación
# ============================================
echo -e "${YELLOW}▶${NC} FASE 5: Verificando..."
echo ""

# Verificar servicios locales
echo "Servicios locales:"
if ss -tlnp | grep -q ":3000 "; then
    echo -e "  ${GREEN}✓${NC} Dashboard (puerto 3000)"
else
    echo -e "  ${RED}✗${NC} Dashboard NO responde"
fi

if ss -tlnp | grep -q ":3001 "; then
    echo -e "  ${GREEN}✓${NC} API (puerto 3001)"
else
    echo -e "  ${RED}✗${NC} API NO responde"
fi

echo ""
echo "Estado systemd:"
systemctl is-active certilog-api && echo -e "  ${GREEN}●${NC} API: activo" || echo -e "  ${RED}●${NC} API: inactivo"
systemctl is-active certilog-dashboard && echo -e "  ${GREEN}●${NC} Dashboard: activo" || echo -e "  ${RED}●${NC} Dashboard: inactivo"
systemctl is-active certilog-tunnel && echo -e "  ${GREEN}●${NC} Tunnel: activo" || echo -e "  ${RED}●${NC} Tunnel: inactivo"

echo ""

# Tests HTTP locales
echo "Tests locales:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login 2>/dev/null || echo "000")
echo "  Dashboard login: HTTP $HTTP_CODE"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
echo "  API health: HTTP $HTTP_CODE"

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Configuración completada!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Nueva URL unificada:"
echo "  🌐 https://certilog.starkmind.dev"
echo ""
echo "Endpoints:"
echo "  Dashboard: https://certilog.starkmind.dev"
echo "  API:       https://certilog.starkmind.dev/api/*"
echo ""
echo "Nota: Eliminar registro DNS 'api.certilog' ya no es necesario"
echo "      (opcional, pero recomendado para evitar confusiones)"
echo ""
echo "Para ver logs: journalctl -u certilog-tunnel -f"
