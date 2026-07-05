"""
Pipeline süre ölçüm modülü.

Kullanım:
    from tools.profiler import span, report

    with span("node:research"):
        ...

    report()  # stdout'a tablo yazar
"""

import time
import threading
from contextlib import contextmanager
from typing import Generator

_lock = threading.Lock()
_spans: list[dict] = []


@contextmanager
def span(name: str) -> Generator[None, None, None]:
    t0 = time.perf_counter()
    try:
        yield
    finally:
        elapsed = time.perf_counter() - t0
        with _lock:
            _spans.append({"name": name, "elapsed": elapsed})


def reset() -> None:
    with _lock:
        _spans.clear()


def register_span(name: str, elapsed: float) -> None:
    with _lock:
        _spans.append({"name": name, "elapsed": elapsed})


def get_spans_dict() -> dict[str, float]:
    with _lock:
        data = list(_spans)
    agg: dict[str, float] = {}
    for s in data:
        n = s["name"]
        agg[n] = agg.get(n, 0.0) + s["elapsed"]
    return agg


def report() -> str:
    with _lock:
        data = list(_spans)

    if not data:
        msg = "[profiler] Hiç span kaydedilmedi."
        print(msg)
        return msg

    total = sum(s["elapsed"] for s in data)

    # Birleştir: aynı ada sahip span'ları topla
    agg: dict[str, dict] = {}
    for s in data:
        n = s["name"]
        if n not in agg:
            agg[n] = {"elapsed": 0.0, "count": 0}
        agg[n]["elapsed"] += s["elapsed"]
        agg[n]["count"] += 1

    rows = sorted(agg.items(), key=lambda x: x[1]["elapsed"], reverse=True)

    lines = []
    lines.append("")
    lines.append("=" * 64)
    lines.append(f"{'ADIM':<35} {'SÜRE':>8}  {'%':>6}  {'ADET':>5}")
    lines.append("-" * 64)
    for name, v in rows:
        pct = (v["elapsed"] / total * 100) if total else 0
        lines.append(f"{name:<35} {v['elapsed']:>7.2f}s  {pct:>5.1f}%  {v['count']:>5}")
    lines.append("-" * 64)
    lines.append(f"{'TOPLAM':<35} {total:>7.2f}s  100.0%")
    lines.append("=" * 64)
    lines.append("")

    report_str = "\n".join(lines)
    print(report_str)
    return report_str
