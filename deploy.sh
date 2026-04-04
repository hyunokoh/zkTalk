#!/bin/bash
set -e

echo "zkTalk Production Deployment"
echo "================================"

# Check env file
if [ ! -f .env.production ]; then
  echo "ERROR: .env.production not found."
  echo "Copy .env.production.example and fill in values:"
  echo "  cp .env.production.example .env.production"
  exit 1
fi

# Validate required env vars
set -a
source .env.production
set +a

REQUIRED_VARS=(POSTGRES_PASSWORD COOKIE_SECRET MAGIC_LINK_SECRET S3_ACCESS_KEY S3_SECRET_KEY)
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ] || [[ "${!var}" == *"CHANGE_ME"* ]]; then
    echo "ERROR: $var is not set or still contains placeholder value."
    exit 1
  fi
done

echo "Building Docker images..."
docker compose -f docker/docker-compose.prod.yml build

echo "Starting services..."
echo "  (migrations and MinIO bucket creation run automatically)"
docker compose -f docker/docker-compose.prod.yml up -d

echo "Waiting for migrations to complete..."
docker compose -f docker/docker-compose.prod.yml logs -f migrate --no-log-prefix 2>/dev/null || true

echo ""
echo "zkTalk is running!"
echo "  Web:     http://localhost:${PORT:-80}"
echo "  API:     http://localhost:${PORT:-80}/api/health"
echo ""
echo "Useful commands:"
echo "  Logs:    docker compose -f docker/docker-compose.prod.yml logs -f"
echo "  Stop:    docker compose -f docker/docker-compose.prod.yml down"
echo "  Restart: docker compose -f docker/docker-compose.prod.yml restart"
