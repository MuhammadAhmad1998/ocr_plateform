#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${POSTGRES_DB:-ocr_platform}"
DB_USER="${POSTGRES_USER:-ocr}"
DB_PASSWORD="${POSTGRES_PASSWORD:-ocr}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OCR_PLATFORM_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Setting up local PostgreSQL for OCR Platform"

start_postgres_linux() {
  if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    return
  fi

  if command -v service >/dev/null 2>&1; then
    sudo service postgresql start
    return
  fi

  echo "Could not start PostgreSQL automatically on Linux."
  echo "Install it with: sudo apt install postgresql postgresql-contrib"
  exit 1
}

postgres_bin_path() {
  if command -v brew >/dev/null 2>&1; then
    if brew list postgresql@16 >/dev/null 2>&1; then
      printf '%s' "$(brew --prefix postgresql@16)/bin"
      return
    fi
    if brew list postgresql >/dev/null 2>&1; then
      printf '%s' "$(brew --prefix postgresql)/bin"
      return
    fi
  fi
  printf '%s' ""
}

start_postgres_macos() {
  if command -v brew >/dev/null 2>&1; then
    if ! brew list postgresql@16 >/dev/null 2>&1 && ! brew list postgresql >/dev/null 2>&1; then
      echo "==> Installing PostgreSQL via Homebrew"
      brew install postgresql@16
    fi

    local pg_bin
    pg_bin="$(postgres_bin_path)"
    if [ -n "${pg_bin}" ]; then
      export PATH="${pg_bin}:${PATH}"
    fi

    local data_dir=""
    if brew list postgresql@16 >/dev/null 2>&1; then
      data_dir="/opt/homebrew/var/postgresql@16"
      if [ ! -f "${data_dir}/PG_VERSION" ]; then
        echo "==> Initializing PostgreSQL data directory"
        LC_ALL=en_US.UTF-8 initdb --locale=en_US.UTF-8 -E UTF-8 "${data_dir}"
      fi
      brew services start postgresql@16
    else
      brew services start postgresql
    fi
    return
  fi

  echo "Homebrew not found. Install PostgreSQL manually: https://www.postgresql.org/download/macosx/"
  exit 1
}

install_postgres_linux() {
  if command -v psql >/dev/null 2>&1; then
    return
  fi

  if command -v apt-get >/dev/null 2>&1; then
    echo "==> Installing PostgreSQL via apt"
    sudo apt-get update
    sudo apt-get install -y postgresql postgresql-contrib
    return
  fi

  echo "PostgreSQL is not installed. Install it with your package manager, then re-run this script."
  exit 1
}

wait_for_postgres() {
  echo "==> Waiting for PostgreSQL on localhost:5432"
  for _ in $(seq 1 30); do
    if command -v pg_isready >/dev/null 2>&1 && pg_isready -h localhost -p 5432 -q; then
      return 0
    fi
    if python3 - <<'PY' 2>/dev/null
import socket
s = socket.socket()
s.settimeout(1)
try:
    s.connect(("127.0.0.1", 5432))
except OSError:
    raise SystemExit(1)
PY
    then
      return 0
    fi
    sleep 1
  done

  echo "PostgreSQL did not become ready on port 5432."
  exit 1
}

init_with_psql() {
  echo "==> Creating role and database"
  local psql_cmd=(psql -v ON_ERROR_STOP=1 -d postgres)
  if id postgres >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    sudo -u postgres "${psql_cmd[@]}" <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}') \\gexec
SQL
  else
    "${psql_cmd[@]}" <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}') \\gexec
SQL
  fi
}

admin_database_url() {
  if [ -n "${POSTGRES_ADMIN_URL:-}" ]; then
    printf '%s' "${POSTGRES_ADMIN_URL}"
    return
  fi

  case "$(uname -s)" in
    Darwin)
      printf 'postgresql://%s@localhost:5432/postgres' "$(whoami)"
      ;;
    *)
      printf 'postgresql://postgres@localhost:5432/postgres'
      ;;
  esac
}

init_with_python() {
  echo "==> Creating role and database via Python"
  cd "${OCR_PLATFORM_ROOT}"
  if [ -f "../venv/bin/activate" ]; then
    # shellcheck disable=SC1091
    source "../venv/bin/activate"
  elif [ -f "venv/bin/activate" ]; then
    # shellcheck disable=SC1091
    source "venv/bin/activate"
  fi

  POSTGRES_DB="${DB_NAME}" \
  POSTGRES_USER="${DB_USER}" \
  POSTGRES_PASSWORD="${DB_PASSWORD}" \
  POSTGRES_ADMIN_URL="$(admin_database_url)" \
  DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}" \
    python3 scripts/init_db.py
}

case "$(uname -s)" in
  Linux)
    install_postgres_linux
    start_postgres_linux
    ;;
  Darwin)
    start_postgres_macos
    ;;
  *)
    echo "Unsupported OS. Install PostgreSQL manually, then run: python3 scripts/init_db.py"
    exit 1
    ;;
esac

wait_for_postgres

if command -v psql >/dev/null 2>&1; then
  init_with_psql || init_with_python
else
  init_with_python
fi

echo ""
echo "PostgreSQL is ready."
echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
echo ""
echo "Start the API:"
echo "  cd ocr_platform && uvicorn app.main:app --reload --port 8002"
