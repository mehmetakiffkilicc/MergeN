import hashlib
import json
import shutil
from pathlib import Path
from typing import Any, Callable

_CACHE_DIR = Path(__file__).parent.parent / ".cache"


def _key_to_path(key: str) -> Path:
    digest = hashlib.sha256(key.encode()).hexdigest()
    return _CACHE_DIR / f"{digest}.json"


def cache_get_or_compute(key: str, fn: Callable[[], Any]) -> Any:
    path = _key_to_path(key)
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    result = fn()
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


def cache_clear() -> None:
    if _CACHE_DIR.exists():
        shutil.rmtree(_CACHE_DIR)
