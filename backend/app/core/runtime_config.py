from pathlib import Path
import json

from app.core.config import settings

CONFIG_PATH = Path("/app/runtime_config.json")

DEFAULT_RUNTIME_CONFIG = {
    "entra_client_id": settings.ENTRA_CLIENT_ID or "",
    "entra_tenant_id": settings.ENTRA_TENANT_ID or "",
    "entra_redirect_uri": settings.ENTRA_REDIRECT_URI,
    "disable_password_auth": False,
}


def get_runtime_config() -> dict:
    if not CONFIG_PATH.exists():
        return DEFAULT_RUNTIME_CONFIG.copy()

    try:
        stored = json.loads(CONFIG_PATH.read_text())
    except (OSError, json.JSONDecodeError):
        stored = {}

    return {**DEFAULT_RUNTIME_CONFIG, **stored}


def save_runtime_config(config: dict) -> dict:
    merged = {**get_runtime_config(), **config}
    CONFIG_PATH.write_text(json.dumps(merged, indent=2))
    return merged
