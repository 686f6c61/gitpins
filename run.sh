#!/usr/bin/env bash

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   GitPins - Docker Local Environment${NC}"
echo -e "${GREEN}========================================${NC}"

if [[ ! -f ".env.docker" ]]; then
  echo -e "${YELLOW}No .env.docker found. Creating from template...${NC}"
  cp .env.docker.example .env.docker
  echo -e "${YELLOW}Edit .env.docker with your GitHub App local credentials and run again.${NC}"
  exit 1
fi

echo -e "${YELLOW}Starting Docker services...${NC}"
docker compose up -d

echo -e "${GREEN}✓${NC} Services started"
echo
echo -e "App:       ${GREEN}http://localhost:3001${NC}"
echo -e "Database:  ${GREEN}localhost:5432${NC}"
echo
echo -e "To follow logs: ${YELLOW}docker compose logs -f app${NC}"
echo -e "To clone Neon to local: ${YELLOW}SOURCE_DB_URL='postgresql://...' ./scripts/clone-neon-to-local.sh${NC}"
