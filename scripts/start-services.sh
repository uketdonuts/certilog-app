#!/bin/bash
set -e

echo "🚀 Iniciando servicios de Certilog..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Función para verificar si un puerto está en uso
check_port() {
    ss -tlnp | grep -q ":$1 " || netstat -tlnp 2>/dev/null | grep -q ":$1 "
}

# Iniciar API si no está corriendo
echo -e "${YELLOW}▶${NC} Verificando API en puerto 3001..."
if check_port 3001; then
    echo -e "${GREEN}✓${NC} API ya está corriendo en puerto 3001"
else
    echo "  Iniciando API..."
    cd /root/proyectos/certilog-app/apps/api
    npm run build > /tmp/api-build.log 2>&1 || true
    
    # Ejecutar la API en background
    nohup npm start > /tmp/api.log 2>&1 &
    
    # Esperar a que inicie
    for i in {1..30}; do
        if check_port 3001; then
            echo -e "${GREEN}✓${NC} API iniciada en puerto 3001"
            break
        fi
        sleep 1
    done
    
    if ! check_port 3001; then
        echo "❌ Error: No se pudo iniciar la API"
        exit 1
    fi
fi

echo ""

# Iniciar Dashboard si no está corriendo
echo -e "${YELLOW}▶${NC} Verificando Dashboard en puerto 3000..."
if check_port 3000; then
    echo -e "${GREEN}✓${NC} Dashboard ya está corriendo en puerto 3000"
else
    echo "  Iniciando Dashboard..."
    cd /root/proyectos/certilog-app/apps/dashboard
    npm run build > /tmp/dashboard-build.log 2>&1 || true
    
    # Ejecutar el dashboard en background
    nohup npm start > /tmp/dashboard.log 2>&1 &
    
    # Esperar a que inicie
    for i in {1..30}; do
        if check_port 3000; then
            echo -e "${GREEN}✓${NC} Dashboard iniciado en puerto 3000"
            break
        fi
        sleep 1
    done
    
    if ! check_port 3000; then
        echo "❌ Error: No se pudo iniciar el Dashboard"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}✅ Todos los servicios están corriendo!${NC}"
echo ""
echo "📊 Estado:"
ss -tlnp | grep -E "(3000|3001)" | grep "LISTEN" || netstat -tlnp 2>/dev/null | grep -E "(3000|3001)"
echo ""
