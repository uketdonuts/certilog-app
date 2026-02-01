#!/bin/bash

echo "🌐 Iniciando Cloudflare Tunnel..."
echo ""

# Verificar que existe el archivo de credenciales
if [ ! -f "/root/.cloudflared/1cda938f-882c-4c94-9613-ac2df8d88ac4.json" ]; then
    echo "❌ Error: No se encontró el archivo de credenciales del túnel"
    echo "Ubicación esperada: /root/.cloudflared/1cda938f-882c-4c94-9613-ac2df8d88ac4.json"
    exit 1
fi

echo "📋 Configuración del túnel:"
echo "   • Dashboard: https://certilog.starkmind.dev → localhost:3000"
echo "   • API:       https://api.certilog.starkmind.dev → localhost:3001"
echo ""

# Iniciar el túnel con el archivo de configuración
exec cloudflared tunnel --config /root/proyectos/certilog-app/.cloudflared/config.yml run
