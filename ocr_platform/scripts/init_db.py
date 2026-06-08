"""Create the ocr_platform PostgreSQL role and database if they do not exist."""

from __future__ import annotations

import os
import sys

import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

DB_NAME = os.getenv("POSTGRES_DB", "ocr_platform")
DB_USER = os.getenv("POSTGRES_USER", "ocr")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "ocr")
def _default_admin_url() -> str:
    return os.getenv(
        "POSTGRES_ADMIN_URL",
        f"postgresql://{os.getenv('USER', 'postgres')}@localhost:5432/postgres",
    )


def _connect_admin():
    return psycopg2.connect(_default_admin_url())


def _role_exists(cur, role: str) -> bool:
    cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (role,))
    return cur.fetchone() is not None


def _database_exists(cur, db_name: str) -> bool:
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
    return cur.fetchone() is not None


def init_database() -> None:
    conn = _connect_admin()
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    try:
        with conn.cursor() as cur:
            if not _role_exists(cur, DB_USER):
                cur.execute(
                    sql.SQL("CREATE ROLE {} WITH LOGIN PASSWORD %s").format(sql.Identifier(DB_USER)),
                    (DB_PASSWORD,),
                )
                print(f"Created role: {DB_USER}")

            if not _database_exists(cur, DB_NAME):
                cur.execute(
                    sql.SQL("CREATE DATABASE {} OWNER {}").format(
                        sql.Identifier(DB_NAME),
                        sql.Identifier(DB_USER),
                    )
                )
                print(f"Created database: {DB_NAME}")
    finally:
        conn.close()


def verify_app_connection(database_url: str) -> None:
    conn = psycopg2.connect(database_url)
    conn.close()


if __name__ == "__main__":
    database_url = os.getenv(
        "DATABASE_URL",
        f"postgresql://{DB_USER}:{DB_PASSWORD}@localhost:5432/{DB_NAME}",
    )
    try:
        init_database()
        verify_app_connection(database_url)
        print("PostgreSQL is ready.")
    except psycopg2.OperationalError as exc:
        print("Failed to initialize PostgreSQL:", exc, file=sys.stderr)
        print(
            "\nRun the setup script first:\n"
            "  bash scripts/setup_postgres.sh",
            file=sys.stderr,
        )
        sys.exit(1)
