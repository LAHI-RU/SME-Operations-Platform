#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# This script runs on EC2 as root through Systems Manager.
if [[ "$EUID" -ne 0 ]]; then
  echo "Run this script as root."
  exit 1
fi

TAG="${1:-}"
if [[ ! "$TAG" =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]]; then
  echo "Expected image tag: COMMIT_SHA-RUN_ID-ATTEMPT"
  exit 1
fi

APP="/home/ubuntu/apps/sme-platform"
STATE="/home/ubuntu/sme-deploy"
REGISTRY="102798329445.dkr.ecr.ap-south-1.amazonaws.com"
SITE="https://lahiru-sme-demo.duckdns.org"

cd "$APP"

# Deployment configuration must come from the image's source commit.
CURRENT_SHA=$(runuser -u ubuntu -- git -C "$APP" rev-parse HEAD)
if [[ "$CURRENT_SHA" != "${TAG%%-*}" ]]; then
  echo "Server checkout must match the image's source commit."
  exit 1
fi

mkdir -p "$STATE"
chmod 700 "$STATE"

# Prevent two deployments from changing containers simultaneously.
exec 9>"$STATE/deploy.lock"
if ! flock -n 9; then
  echo "Another deployment is already running."
  exit 1
fi

RUN=$(mktemp -d "$STATE/run-${TAG}.XXXXXX")
CANDIDATE="$RUN/candidate.yaml"
ROLLBACK="$RUN/rollback.yaml"
SWITCHED=0

BASE=(
  --project-name sme-platform
  --project-directory "$APP"
  -f "$APP/compose.yaml"
  -f "$APP/compose.backend.yaml"
  -f "$APP/compose.frontend.yaml"
  -f "$APP/compose.aws.yaml"
)

dc() {
  local override="$1"
  shift
  docker compose "${BASE[@]}" -f "$override" "$@"
}

start_services() {
  dc "$1" up -d --no-deps --no-build --pull never \
    --force-recreate --wait --wait-timeout 180 \
    backend api frontend caddy
}

check_health() {
  curl -fsS --retry 3 --retry-delay 2 --retry-connrefused \
    --max-time 20 "$SITE/healthz" \
    > "$RUN/frontend-health.txt" || return 1

  grep -qx "ok" "$RUN/frontend-health.txt" || return 1

  curl -fsS --retry 3 --retry-delay 2 --retry-connrefused \
    --max-time 20 "$SITE/api/v1/health" \
    > "$RUN/api-health.json" || return 1

  python3 -c \
    'import json,sys; sys.exit(0 if json.load(open(sys.argv[1])).get("success") is True else 1)' \
    "$RUN/api-health.json"
}

save_current() {
  cp "$1" "$STATE/current.yaml.next" &&
    mv "$STATE/current.yaml.next" "$STATE/current.yaml"
}

finish() {
  local result=$?
  trap - EXIT
  set +e

  if [[ "$result" -ne 0 && "$SWITCHED" -eq 1 ]]; then
    echo "Deployment failed. Restoring the previous images."

    if start_services "$ROLLBACK" &&
       check_health &&
       save_current "$ROLLBACK"; then
      echo "Previous application version restored successfully."
    else
      echo "Automatic recovery failed. Manual investigation is required."
      echo "Rollback configuration: $ROLLBACK"
    fi
  fi

  exit "$result"
}
trap finish EXIT

echo "Downloading release: $TAG"
aws ecr get-login-password --region ap-south-1 |
  docker login --username AWS --password-stdin "$REGISTRY"

docker pull "$REGISTRY/sme-backend:$TAG"
docker pull "$REGISTRY/sme-frontend:$TAG"

cat > "$CANDIDATE" <<EOF
services:
  backend:
    image: $REGISTRY/sme-backend:$TAG
  frontend:
    image: $REGISTRY/sme-frontend:$TAG
    build: !reset null
EOF

dc "$CANDIDATE" config --quiet

echo "Checking database migrations."
dc "$CANDIDATE" run --rm --no-deps --pull never -T \
  backend php artisan migrate:status --no-interaction --no-ansi \
  > "$RUN/migrations.txt"

if grep -q "Pending" "$RUN/migrations.txt"; then
  cat "$RUN/migrations.txt"
  echo "Pending migrations require a separate migration plan."
  exit 1
fi

echo "Preserving the currently running application images."
ROLLBACK_TAG="rollback-$(date -u +%Y%m%dT%H%M%SZ)-$$"

docker image tag \
  "$(docker inspect --format '{{.Image}}' sme-platform-backend-1)" \
  "sme-backend:$ROLLBACK_TAG"

docker image tag \
  "$(docker inspect --format '{{.Image}}' sme-platform-frontend-1)" \
  "sme-frontend:$ROLLBACK_TAG"

cat > "$ROLLBACK" <<EOF
services:
  backend:
    image: sme-backend:$ROLLBACK_TAG
  frontend:
    image: sme-frontend:$ROLLBACK_TAG
    build: !reset null
EOF

dc "$ROLLBACK" config --quiet

echo "Creating and reading a database backup."
docker exec sme_order_postgres sh -c \
  'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "$RUN/database.dump"

docker exec -i sme_order_postgres \
  pg_restore --file=/dev/null < "$RUN/database.dump"

echo "Starting the release."
SWITCHED=1
start_services "$CANDIDATE"
check_health
save_current "$CANDIDATE"
SWITCHED=0

echo "Deployment succeeded: $TAG"
echo "Backup and rollback files: $RUN"
dc "$CANDIDATE" ps