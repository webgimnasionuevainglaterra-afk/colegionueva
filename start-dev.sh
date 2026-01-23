#!/bin/bash

# Script para iniciar el servidor de desarrollo
echo "🔄 Limpiando procesos anteriores..."
pkill -9 -f "next dev" 2>/dev/null
sleep 2

echo "🗑️  Limpiando cache..."
rm -rf .next

echo "🚀 Iniciando servidor Next.js en puerto 3000..."
echo ""
echo "📋 URLs disponibles:"
echo "   - http://localhost:3000 (página principal)"
echo "   - http://localhost:3000/test (página de prueba)"
echo "   - http://localhost:3000/aula-virtual"
echo ""
echo "⏳ Espera a ver 'Ready' en la terminal..."
echo ""

npm run dev







