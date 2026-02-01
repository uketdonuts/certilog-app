#!/bin/bash
set -e

echo "🚀 Desplegando Certilog con Cloudflare Tunnel..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd /root/proyectos/certilog-app

# ============================================
# 1. Compilar la API
# ============================================
echo -e "${YELLOW}▶${NC} Compilando API..."
cd apps/api
npm run build
cd ../..
echo -e "${GREEN}✓${NC} API compilada"
echo ""

# ============================================
# 2. Actualizar variables de entorno del Dashboard
# ============================================
echo -e "${YELLOW}▶${NC} Configurando Dashboard..."
cat > apps/dashboard/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.certilog.starkmind.dev
NEXT_PUBLIC_SOCKET_URL=https://api.certilog.starkmind.dev
NEXT_PUBLIC_MAPBOX_TOKEN=
EOF
echo -e "${GREEN}✓${NC} Variables de entorno del Dashboard actualizadas"
echo ""

# ============================================
# 3. Recargar systemd y reiniciar servicios
# ============================================
echo -e "${YELLOW}▶${NC} Recargando systemd..."
systemctl daemon-reload

echo -e "${YELLOW}▶${NC} Reiniciando servicios..."
systemctl restart certilog-api.service
systemctl restart certilog-dashboard.service
sleep 2
systemctl restart certilog-tunnel.service

echo -e "${GREEN}✓${NC} Servicios reiniciados"
echo ""

# ============================================
# 4. Verificar estado
# ============================================
echo -e "${YELLOW}▶${NC} Verificando estado de los servicios..."
sleep 3

# Verificar puertos
API_OK=false
DASHBOARD_OK=false

if ss -tlnp | grep -q ":3001 "; then
    echo -e "${GREEN}✓${NC} API escuchando en puerto 3001"
    API_OK=true
else
    echo -e "${RED}✗${NC} API NO está escuchando en puerto 3001"
fi

if ss -tlnp | grep -q ":3000 "; then
    echo -e "${GREEN}✓${NC} Dashboard escuchando en puerto 3000"
    DASHBOARD_OK=true
else
    echo -e "${RED}✗${NC} Dashboard NO está escuchando en puerto 3000"
fi

echo ""
echo "📊 Estado de los servicios:"
systemctl is-active certilog-api.service && echo -e "  ${GREEN}●${NC} API: activo" || echo -e "  ${RED}●${NC} API: inactivo"
systemctl is-active certilog-dashboard.service && echo -e "  ${GREEN}●${NC} Dashboard: activo" || echo -e "  ${RED}●${NC} Dashboard: inactivo"
systemctl is-active certilog-tunnel.service && echo -e "  ${GREEN}●${NC} Tunnel: activo" || echo -e "  ${RED}●${NC} Tunnel: inactivo"

echo ""
echo "🌐 URLs de acceso:"
echo "   • Dashboard: https://certilog.starkmind.dev"
echo "   • API:       https://api.certilog.starkmind.dev"
echo ""
echo "📋 Comandos útiles:"
echo "   Ver logs API:       journalctl -u certilog-api -f"
echo "   Ver logs Dashboard: journalctl -u certilog-dashboard -f"
echo "   Ver logs Tunnel:    journalctl -u certilog-tunnel -f"
echo ""

if [ "$API_OK" = true ] && [ "$DASHBOARD_OK" = true ]; then
    echo -e "${GREEN}✅ Despliegue completado exitosamente!${NC}"
else
    echo -e "${RED}⚠️  Algunos servicios no están funcionando correctamente${NC}"
    exit 1
fi
