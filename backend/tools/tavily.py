import logging
from typing import Literal, Callable, Any

from tavily import TavilyClient

from config import settings
from tools.cache import cache_get_or_compute

logger = logging.getLogger(__name__)

# Parse comma-separated keys from settings.tavily_api_keys
env_keys = []
if settings.tavily_api_keys:
    env_keys = [k.strip() for k in settings.tavily_api_keys.split(",") if k.strip()]

# Dedup keys
_TAVILY_KEYS = []
_seen = set()
for k in [settings.tavily_api_key] + env_keys:
    if k and k.strip() and k not in _seen:
        _TAVILY_KEYS.append(k.strip())
        _seen.add(k)

# Default fallback list if no keys are found
if not _TAVILY_KEYS:
    _TAVILY_KEYS = ["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"]

_current_key_idx = 0


def _execute_with_tavily_fallback(fn_caller: Callable[[TavilyClient], Any]) -> Any:
    global _current_key_idx
    last_exc = None
    num_keys = len(_TAVILY_KEYS)
    
    for attempt in range(num_keys):
        idx = (_current_key_idx + attempt) % num_keys
        key = _TAVILY_KEYS[idx]
        
        # Mask the key for logs
        masked_key = f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "..."
        logger.info(
            "Trying Tavily API call using key at index %d (%s)...", 
            idx, masked_key
        )
        
        try:
            client = TavilyClient(api_key=key)
            result = fn_caller(client)
            
            # Success! Update global pointer so future calls start with this working key
            if _current_key_idx != idx:
                logger.info("Successfully switched to Tavily API key index %d.", idx)
                _current_key_idx = idx
            return result
        except Exception as exc:
            logger.warning(
                "Tavily API key at index %d (%s) failed or hit limit: %s. Trying next...",
                idx, masked_key, exc
            )
            last_exc = exc
            
    logger.error("All %d Tavily API keys have been exhausted or failed!", num_keys)
    raise last_exc or ValueError("All Tavily API keys are exhausted.")


def search(
    query: str,
    *,
    max_results: int = 10,
    include_domains: list[str] | None = None,
    search_depth: Literal["basic", "advanced"] = "basic",
) -> list[dict]:
    domains_key = str(sorted(include_domains)) if include_domains else "[]"
    key = f"tavily:{search_depth}:{domains_key}:{max_results}:{query}"

    def _call() -> list[dict]:
        def _api_call(client: TavilyClient) -> list[dict]:
            kwargs: dict = {
                "query": query,
                "max_results": max_results,
                "search_depth": search_depth,
            }
            if include_domains:
                kwargs["include_domains"] = include_domains
            resp = client.search(**kwargs)
            return [
                {
                    "url": r.get("url", ""),
                    "title": r.get("title", ""),
                    "content": r.get("content", ""),
                    "score": r.get("score", 0.0),
                }
                for r in resp.get("results", [])
            ]
        
        return _execute_with_tavily_fallback(_api_call)

    return cache_get_or_compute(key, _call)
