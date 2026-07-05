"""
Hızlı veri toplama CLI — Playwright YOK, hedef 5-15 saniye.

Kullanım:
  python run.py --name "Sony WH-1000XM5"
  python run.py --name "AirPods Pro 2" --trendyol "https://www.trendyol.com/.../p-12345"
  python run.py --name "JBL Tune 720BT" --no-forums
  python run.py --name "Sony WH-1000XM5" --output "C:/veri"
"""

import argparse
import asyncio
import sys
import io
from pathlib import Path

# Windows terminal Türkçe karakter desteği
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Proje kökünü Python path'ine ekle
sys.path.insert(0, str(Path(__file__).parent))

from collector import collect


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Hızlı çok kaynaklı ürün yorum toplayıcı (Playwright YOK)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--name", required=True, help="Ürün adı (zorunlu)")
    parser.add_argument("--trendyol", help="Trendyol ürün URL'si")
    parser.add_argument("--hepsiburada", help="Hepsiburada ürün URL'si")
    parser.add_argument("--no-forums", action="store_true", help="Forum verisini atla")
    parser.add_argument("--no-youtube", action="store_true", help="YouTube verisini atla")
    parser.add_argument(
        "--output",
        default="scraped_data",
        help="Çıktı ana klasörü (varsayılan: scraped_data/)",
    )

    args = parser.parse_args()

    asyncio.run(
        collect(
            product_name=args.name,
            trendyol_url=args.trendyol,
            hepsiburada_url=args.hepsiburada,
            output_dir=args.output,
            skip_forums=args.no_forums,
            skip_youtube=args.no_youtube,
        )
    )


if __name__ == "__main__":
    main()
