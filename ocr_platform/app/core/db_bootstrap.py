"""Wait for PostgreSQL and optionally initialize the local database."""

from __future__ import annotations

import logging
import subprocess
import sys
import time
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.core.config import get_settings

logger = logging.getLogger(__name__)
_SETUP_SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "setup_postgres.sh"


def _try_init_local_database() -> bool:
    settings = get_settings()
    if not settings.DATABASE_URL.startswith("postgresql"):
        return False

    script = Path(__file__).resolve().parents[2] / "scripts" / "init_db.py"
    if not script.exists():
        return False

    try:
        subprocess.run(
            [sys.executable, str(script)],
            check=True,
            capture_output=True,
            text=True,
            timeout=30,
            env={
                **dict(__import__("os").environ),
                "DATABASE_URL": settings.DATABASE_URL,
            },
        )
        return True
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError) as exc:
        logger.debug("Local PostgreSQL auto-init skipped: %s", exc)
        return False


def wait_for_database(engine, retries: int = 15, delay_seconds: float = 2.0) -> None:
    settings = get_settings()
    last_error: Exception | None = None

    for attempt in range(1, retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except OperationalError as exc:
            last_error = exc
            if attempt == 3 and settings.DATABASE_URL.startswith("postgresql"):
                if _try_init_local_database():
                    continue
            if attempt < retries:
                logger.warning(
                    "Database not ready (attempt %s/%s). Retrying in %ss...",
                    attempt,
                    retries,
                    delay_seconds,
                )
                time.sleep(delay_seconds)

    message = (
        "Could not connect to PostgreSQL.\n\n"
        "Start and initialize a local PostgreSQL instance:\n"
        f"  bash {_SETUP_SCRIPT}\n\n"
        f"Expected DATABASE_URL: {settings.DATABASE_URL}\n"
    )
    raise RuntimeError(message) from last_error


# Columns added after initial deploy — create_all does not alter existing tables.
_SCHEMA_PATCHES: tuple[tuple[str, str, str], ...] = (
    ("ocr_jobs", "webhook_url", "VARCHAR(2048)"),
    ("users", "platform_account_id", "UUID"),
    ("api_keys", "key_hash_algorithm", "VARCHAR(20) DEFAULT 'sha256'"),
    ("api_keys", "key_source", "VARCHAR(20) DEFAULT 'local'"),
    ("api_keys", "platform_key_id", "UUID"),
    ("api_keys", "platform_tenant_id", "UUID"),
    ("api_keys", "platform_account_id", "UUID"),
    ("api_keys", "platform_user_id", "UUID"),
    ("api_keys", "platform_subscription_id", "UUID"),
    ("api_keys", "user_email", "VARCHAR(255)"),
    ("api_keys", "quota_limit", "INTEGER"),
    ("api_keys", "quota_used", "INTEGER DEFAULT 0"),
    ("api_keys", "expires_at", "TIMESTAMPTZ"),
    ("api_keys", "last_used_at", "TIMESTAMPTZ"),
    ("api_keys", "scopes", "JSONB DEFAULT '[]'::jsonb"),
)


def sync_database_schema(engine) -> None:
    """Apply additive schema patches for databases created before new columns were added."""
    if not get_settings().DATABASE_URL.startswith("postgresql"):
        return

    with engine.begin() as conn:
        for table, column, column_type in _SCHEMA_PATCHES:
            exists = conn.execute(
                text(
                    """
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = :table
                      AND column_name = :column
                    """
                ),
                {"table": table, "column": column},
            ).fetchone()
            if exists:
                continue
            conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{column}" {column_type}'))
            logger.info("Added missing column %s.%s", table, column)

        # Widen api_keys.key_hash for bcrypt hashes from platform provisioning.
        key_hash_len = conn.execute(
            text(
                """
                SELECT character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'api_keys'
                  AND column_name = 'key_hash'
                """
            )
        ).scalar()
        if key_hash_len is not None and key_hash_len < 255:
            conn.execute(text('ALTER TABLE api_keys ALTER COLUMN key_hash TYPE VARCHAR(255)'))
            logger.info("Widened api_keys.key_hash to VARCHAR(255)")
