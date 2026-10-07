#!/usr/bin/env bash
# Reads this database's Medusa publishable API key and writes it into the web storefront
# and mobile app env files. Run it once after the first `medusa db:migrate` (and again
# any time you reset the database - every database generates its own key).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_URL="${DATABASE_URL:-postgres://petzy:petzy_dev_pw@localhost:5432/petzy}"
SQL="select token from api_key where type='publishable' and deleted_at is null order by created_at limit 1"

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -qx petzy-postgres; then
  KEY="$(docker exec petzy-postgres psql -U petzy -d petzy -tAc "$SQL")"
elif command -v psql >/dev/null 2>&1; then
  KEY="$(psql "$DB_URL" -tAc "$SQL")"
else
  echo "Could not find docker (petzy-postgres) or psql. Copy the key by hand: Admin -> Settings -> Publishable API Keys." >&2
  exit 1
fi
[ -n "$KEY" ] || { echo "No publishable key found. Did you run 'npx medusa db:migrate' first?" >&2; exit 1; }

set_var() { # file name value
  local f="$1" k="$2" v="$3"
  if grep -q "^$k=" "$f"; then
    sed -i.bak "s|^$k=.*|$k=$v|" "$f" && rm -f "$f.bak"
  else
    echo "$k=$v" >> "$f"
  fi
}

SF="$ROOT/backend/apps/storefront"
[ -f "$SF/.env.local" ] || cp "$SF/.env.local.example" "$SF/.env.local"
set_var "$SF/.env.local" NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY "$KEY"

MB="$ROOT/mobile"
[ -f "$MB/.env" ] || cp "$MB/.env.example" "$MB/.env"
set_var "$MB/.env" EXPO_PUBLIC_PUBLISHABLE_KEY "$KEY"

echo "Publishable key synced to storefront/.env.local and mobile/.env"
