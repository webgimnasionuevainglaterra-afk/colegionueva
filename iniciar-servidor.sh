#!/bin/bash

echo "=========================================="
echo "🚀 INICIANDO SERVIDOR COLEGIO NUEVA"
echo "=========================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Limpiar procesos anteriores
echo -e "${YELLOW}🔄 Limpiando procesos anteriores...${NC}"
pkill -9 -f "next dev" 2>/dev/null
sleep 2

# Limpiar cache
echo -e "${YELLOW}🗑️  Limpiando cache...${NC}"
rm -rf .next
echo -e "${GREEN}✓ Cache eliminado${NC}"
echo ""

# Verificar node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${RED}✗ node_modules no encontrado${NC}"
    echo "Ejecutando npm install..."
    npm install
fi

# Verificar puerto
PORT=3000
if lsof -ti:$PORT > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Puerto $PORT está ocupado, liberando...${NC}"
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
    sleep 2
fi

echo -e "${GREEN}✓ Todo listo para iniciar${NC}"
echo ""
echo "=========================================="
echo "📡 Iniciando servidor Next.js..."
echo "=========================================="
echo ""
echo -e "${GREEN}URLs disponibles:${NC}"
echo "   - http://localhost:$PORT (página principal)"
echo "   - http://localhost:$PORT/test (página de prueba)"
echo "   - http://localhost:$PORT/aula-virtual"
echo ""
echo -e "${YELLOW}⏳ Espera a ver 'Ready' en la terminal...${NC}"
echo ""
echo "=========================================="
echo ""

# Iniciar servidor con variables de entorno correctas
HOSTNAME=localhost npm run dev

