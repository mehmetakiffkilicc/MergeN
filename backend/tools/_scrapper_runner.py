"""
Scrapper subprocess runner — doğrudan python ile çağrılır, JSON yazar.
Namespace izolasyonu: scrapper'ın kendi tools/ paketi burada çözümlenir.

Kullanım (scrapper_io.py tarafından otomatik çağrılır):
  python _scrapper_runner.py "Ürün Adı" [--trendyol-url URL] [--hepsiburada-url URL]
"""

import sys
import json
import asyncio
import argparse
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# Scrapper modülleri import sırasında stdout'a yazabilir; JSON yalnızca
# son satırda çıkacağından import öncesi stdout→stderr yönlendir.
_real_stdout = sys.stdout
sys.stdout = sys.stderr

_SCRAPPER_PATH = Path(__file__).parent.parent.parent / "scrapper"

sys.path.insert(0, str(_SCRAPPER_PATH))

from collector import collect, build_ai_input  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("product_name")
    parser.add_argument("--trendyol-url", default=None)
    parser.add_argument("--hepsiburada-url", default=None)
    parser.add_argument("--skip-forums", action="store_true")
    parser.add_argument("--skip-youtube", action="store_true")
    args = parser.parse_args()

    data = asyncio.run(collect(
        args.product_name,
        trendyol_url=args.trendyol_url,
        hepsiburada_url=args.hepsiburada_url,
        skip_forums=args.skip_forums,
        skip_youtube=args.skip_youtube,
        skip_photos=True,
    ))
    ai = build_ai_input(data)

    sys.stdout = _real_stdout
    print(json.dumps(ai, ensure_ascii=False))


if __name__ == "__main__":
    main()
