"""
Central model manager to handle GPU memory and model lifecycle.

This module ensures that when switching between different models (VLM, PaddleOCR, 
QianfanOCR, GotOCR), the previously loaded model is automatically unloaded 
to prevent CUDA out of memory errors.
"""

import logging
from typing import Literal

from app.core.config import get_settings

logger = logging.getLogger(__name__)

ModelType = Literal["vlm", "paddle_ocr", "qianfan_ocr", "got_ocr"]


class ModelManager:
    """Manages model loading and unloading across different OCR services."""

    def __init__(self) -> None:
        self._current_model: ModelType | None = None
        self._services: dict[ModelType, object] = {}

    def register_service(self, model_type: ModelType, service: object) -> None:
        """Register a service with the model manager."""
        self._services[model_type] = service
        logger.debug("Registered %s service", model_type)

    def before_load(self, model_type: ModelType) -> None:
        """
        Called before loading a model to ensure GPU memory is available.
        
        If a different model is currently loaded, it will be unloaded first.
        """
        settings = get_settings()
        
        # Check if auto-unload is enabled
        if not settings.AUTO_UNLOAD_MODELS:
            logger.debug("AUTO_UNLOAD_MODELS is disabled, skipping model management")
            self._current_model = model_type
            return

        if self._current_model is None:
            logger.info("No model currently loaded, proceeding with %s", model_type)
            self._current_model = model_type
            return

        if self._current_model == model_type:
            logger.debug("Model %s is already current, no unload needed", model_type)
            return

        # Different model is loaded, unload it first
        logger.info(
            "Switching from %s to %s - unloading previous model",
            self._current_model,
            model_type,
        )
        
        previous_service = self._services.get(self._current_model)
        if previous_service and hasattr(previous_service, "unload"):
            try:
                previous_service.unload()
                logger.info("Successfully unloaded %s", self._current_model)
            except Exception as exc:
                logger.warning("Failed to unload %s: %s", self._current_model, exc)

        self._current_model = model_type

    def get_current_model(self) -> ModelType | None:
        """Return the currently active model type."""
        return self._current_model


# Global instance
model_manager = ModelManager()
