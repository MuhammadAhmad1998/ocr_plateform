"""Production security validation at application startup."""

from __future__ import annotations

import logging

from app.core.config import Settings

logger = logging.getLogger(__name__)


def validate_production_settings(settings: Settings) -> None:
    """Warn or error when unsafe defaults are used outside DEBUG mode."""
    if settings.DEBUG:
        logger.info("Running with DEBUG=true (development mode)")
        return

    logger.info("Running with DEBUG=false (production mode)")

    if settings.SECRET_KEY == settings.DEFAULT_SECRET_KEY:
        logger.error(
            "SECRET_KEY is using the default value while DEBUG=false. "
            "Generate a strong key (e.g. openssl rand -hex 32) before production deploy."
        )
