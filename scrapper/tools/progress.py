import json
import sys


def emit_start(source: str) -> None:
    print(f"@@START@@ {json.dumps({'source': source})}", flush=True)


def emit_count(source: str, n: int) -> None:
    print(f"@@COUNT@@ {json.dumps({'source': source, 'n': n})}", flush=True)
