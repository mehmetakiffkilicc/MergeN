"""
Tavily wrapper — çağrı sayacı ile.
Her search çağrısını sayar, limit aşımında uyarır.
"""
import os
import threading

_counter = 0
_limit = 12
_lock = threading.Lock()


def search(query: str, **kwargs) -> dict:
    global _counter
    from tavily import TavilyClient
    client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY", ""))
    with _lock:
        _counter += 1
        if _counter > _limit:
            print(f"  [Tavily] UYARI: {_counter} çağrı (limit: {_limit}/ürün)")
    return client.search(query=query, **kwargs)


def reset(product_name: str = ""):
    global _counter
    with _lock:
        _counter = 0
    if product_name:
        print(f"  [Tavily] Sayaç sıfırlandı")


def count() -> int:
    with _lock:
        return _counter
