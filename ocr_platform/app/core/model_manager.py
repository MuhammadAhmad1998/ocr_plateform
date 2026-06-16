"""
Central model manager to handle GPU memory and model lifecycle.

This module ensures that when switching between different models (VLM, PaddleOCR, 
QianfanOCR, GotOCR), the previously loaded model is automatically unloaded 
to prevent CUDA out of memory errors.
"""

import gc
import logging
from typing import Literal

from app.core.config import get_settings

logger = logging.getLogger(__name__)

ModelType = Literal["vlm", "paddle_ocr", "qianfan_ocr", "got_ocr"]


def _force_free_gpu_memory() -> None:
    """Aggressively free all GPU memory by running multiple GC passes and clearing CUDA cache."""
    try:
        import torch

        # Run multiple GC passes to break circular references
        for _ in range(3):
            gc.collect()

        if torch.cuda.is_available():
            torch.cuda.synchronize()
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
            torch.cuda.reset_peak_memory_stats()

            # Log current state
            free, total = torch.cuda.mem_get_info()
            allocated = torch.cuda.memory_allocated()
            logger.info(
                "GPU memory freed. Allocated: %.2f GB, Free: %.2f GB / %.2f GB",
                allocated / (1024**3),
                free / (1024**3),
                total / (1024**3),
            )
    except Exception as exc:
        logger.warning("Failed to free GPU memory: %s", exc)


def _strip_accelerate_hooks(model) -> None:
    """Remove accelerate dispatch hooks that keep GPU references alive after device_map loading."""
    if model is None:
        return
    try:
        from accelerate.hooks import remove_hook_from_module
        remove_hook_from_module(model, recurse=True)
    except Exception:
        pass  # accelerate not used or hooks not present


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

        # Always force-free GPU memory after unloading, even if unload() failed
        _force_free_gpu_memory()

        self._current_model = model_type

    def unload_all(self) -> None:
        """Unload all registered models and free GPU memory."""
        logger.info("Unloading all models")
        for model_type, service in self._services.items():
            if hasattr(service, "unload") and getattr(service, "is_loaded", False):
                try:
                    service.unload()
                    logger.info("Unloaded %s", model_type)
                except Exception as exc:
                    logger.warning("Failed to unload %s: %s", model_type, exc)
        _force_free_gpu_memory()
        self._current_model = None

    def get_current_model(self) -> ModelType | None:
        """Return the currently active model type."""
        return self._current_model


# Global instance
model_manager = ModelManager()
