#!/bin/bash

# GitPins - Script de desarrollo local
# ====================================

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   GitPins - Entorno de desarrollo${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Instalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Instalando dependencias...${NC}"
    npm install
fi
echo -e "${GREEN}✓${NC} Dependencias OK"

# Generar cliente Prisma
echo -e "${YELLOW}Generando cliente Prisma...${NC}"
npx prisma generate

# Crear/actualizar base de datos SQLite
echo -e "${YELLOW}Configurando base de datos...${NC}"
npx prisma db push

echo -e "${GREEN}✓${NC} Base de datos OK"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Iniciando servidor...${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "App:       ${GREEN}http://localhost:3000${NC}"
echo -e "Dashboard: ${GREEN}http://localhost:3000/dashboard${NC}"
echo -e "Admin:     ${GREEN}http://localhost:3000/admin${NC}"
echo ""

# Iniciar servidor
npm run dev
