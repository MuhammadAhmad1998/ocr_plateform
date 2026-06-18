#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until python -c "
import os, sys
import psycopg2
url = os.environ.get('DATABASE_URL', '')
if not url:
    sys.exit(1)
psycopg2.connect(url).close()
" 2>/dev/null; do
  sleep 2
done
echo "PostgreSQL is ready."

echo "Waiting for Redis..."
until python -c "
import os, sys
import redis
url = os.environ.get('REDIS_URL', '')
if not url:
    sys.exit(1)
redis.from_url(url).ping()
" 2>/dev/null; do
  sleep 2
done
echo "Redis is ready."

exec "$@"
