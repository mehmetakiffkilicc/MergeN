"""
Hızlı paralel veri toplayıcı.
Playwright YOK — httpx + Tavily + youtube-transcript-api.
Hedef: toplama 5-10s, AI analiz için hazır çıktı.

Çıktı: scraped_data/<UrunAdi>/
  ai_input.json    — AI ajanları için normalize edilmiş yapı
  gemini_input.md  — Gemini'ye doğrudan gönderilebilir markdown
  raw_data.json    — Ham veri (debug)
"""

import asyncio
import json
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

import os
if os.getenv("GEMINI_API_KEY") and not os.getenv("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY")

from tools.url_finder import extract_trendyol_id, extract_hb_sku
from tools.smart_query import resolve_smart_query, find_all_platform_urls
from tools.trendyol import fetch_trendyol
from tools.hepsiburada import fetch_hepsiburada
from tools.forums import fetch_forums
from tools.youtube import process_multiple_videos
from tools.visualizer import generate_visuals
from tools.qa import fetch_qa
from tools.distiller import distill_data


# ---------------------------------------------------------------------------
# Ana toplama fonksiyonu
# ---------------------------------------------------------------------------

async def collect(
    product_name: str,
    trendyol_url: Optional[str] = None,
    hepsiburada_url: Optional[str] = None,
    output_dir: str = "scraped_data",
    skip_forums: bool = False,
    skip_youtube: bool = False,
    skip_photos: bool = True,  # Hız için varsayılan True
    forum_direct: bool = True,
) -> dict:
    """
    Tüm kaynaklardan paralel veri toplar ve ürün klasörüne kaydeder.
    Returns: toplanan ham veri sözlüğü
    """
    from tools._tavily import reset as tavily_reset, count as tavily_count

    # URL algılama ve temizleme
    if product_name.startswith("http://") or product_name.startswith("https://"):
        if "trendyol.com" in product_name and not trendyol_url:
            trendyol_url = product_name
        elif "hepsiburada.com" in product_name and not hepsiburada_url:
            hepsiburada_url = product_name

    # URL'den temiz isim çıkar
    def clean_name_from_url(url: str, domain: str) -> str:
        try:
            path = url.split(domain)[-1].split("?")[0]
            parts = [p for p in path.split("/") if p]
            if not parts:
                return ""
            name_segment = parts[-1]
            if "-p-" in name_segment:
                name_segment = name_segment.split("-p-")[0]
            elif "-pm-" in name_segment:
                name_segment = name_segment.split("-pm-")[0]
            name_clean = name_segment.replace("-", " ")
            if domain == "trendyol.com" and len(parts) > 1:
                brand = parts[0].replace("-", " ")
                if brand not in name_clean:
                    name_clean = f"{brand} {name_clean}"
            return name_clean.strip()
        except:
            return ""

    extracted_name = ""
    if trendyol_url:
        extracted_name = clean_name_from_url(trendyol_url, "trendyol.com")
    elif hepsiburada_url:
        extracted_name = clean_name_from_url(hepsiburada_url, "hepsiburada.com")

    if extracted_name and (product_name.startswith("http://") or product_name.startswith("https://") or len(product_name) < 3):
        product_name = extracted_name

    tavily_reset(product_name)
    t0 = time.time()
    timings = {}
    print(f"\n{'='*60}", flush=True)
    print(f"ÜRÜN: {product_name}", flush=True)
    print(f"{'='*60}\n", flush=True)

    # 0. AI ile en optimal arama sorgusunu belirle (tek Gemini çağrısı)
    print(f"[0/2] Akıllı sorgu çözümleniyor (Gemini AI)...", flush=True)
    t_smart = time.time()
    smart = await resolve_smart_query(product_name)
    timings["scrapper:resolve_smart_query"] = time.time() - t_smart
    canonical_name = smart.get("canonical_name", product_name)
    trendyol_query = smart.get("trendyol_query", product_name)
    hb_query = smart.get("hb_query", product_name)
    forum_query = smart.get("forum_query", product_name)

    # Eğer AI canonical bir isim verdiyse, onu ana ürün adı olarak kullan.
    # Guard: canonical, orijinal addaki model kodunu (örn FX608JM-RV073)
    # düşürüyorsa genelleştirme var demektir — orijinal adı koru.
    if canonical_name and canonical_name != product_name and not product_name.startswith("http"):
        _orig_toks = {w.lower() for w in product_name.split() if any(c.isdigit() for c in w)}
        _canon_lower = canonical_name.lower()
        if all(t in _canon_lower for t in _orig_toks):
            print(f"  AI Canonical: {product_name} → {canonical_name}", flush=True)
            product_name = canonical_name
        else:
            print(f"  AI Canonical genelleştirmesi reddedildi: {canonical_name}", flush=True)

    # 1. URL Keşfi (gerekirse veya eksikse)
    product_id: Optional[str] = None
    hb_sku: Optional[str] = None

    if trendyol_url:
        product_id = extract_trendyol_id(trendyol_url)
    if hepsiburada_url:
        hb_sku = extract_hb_sku(hepsiburada_url)

    if not trendyol_url or not hepsiburada_url:
        print(f"[1/2] Tek Tavily çağrısıyla platform URL'leri bulunuyor (Sorgu: {smart.get('search_term', product_name)[:40]})...", flush=True)
        t_urls = time.time()
        urls = await find_all_platform_urls(smart.get("search_term", product_name), validate_name=product_name)
        timings["scrapper:find_all_platform_urls"] = time.time() - t_urls
        
        if not trendyol_url and urls.get("trendyol_url"):
            trendyol_url = urls.get("trendyol_url")
            product_id = extract_trendyol_id(trendyol_url)
            print(f"  Bulunan Trendyol URL: {trendyol_url}", flush=True)
            
        if not hepsiburada_url and urls.get("hepsiburada_url"):
            hepsiburada_url = urls.get("hepsiburada_url")
            hb_sku = extract_hb_sku(hepsiburada_url)
            print(f"  Bulunan Hepsiburada URL: {hepsiburada_url}", flush=True)

        print(f"  Trendyol    : {trendyol_url or 'Bulunamadı'}", flush=True)
        print(f"  Hepsiburada : {hepsiburada_url or 'Bulunamadı'}", flush=True)

    # 2. Tüm kaynaklar paralel — AI optimize edilmiş sorgularla
    print("\n[2/2] Kaynaklar paralel toplanıyor (AI optimized queries)...", flush=True)
    from tools.progress import emit_start, emit_count


    async def _timed(label: str, source: str, coro):
        t = time.time()
        emit_start(source)
        try:
            result = await coro
            if isinstance(result, list):
                n = len(result)
            elif isinstance(result, dict):
                n = len(result) if result else 0
            else:
                n = 0
            elapsed = time.time() - t
            print(f"  [{label}] {elapsed:.1f}s — OK ({n} kayıt)", flush=True)
            timings[f"scrapper:{source}"] = elapsed
            emit_count(source, n)
            return result
        except Exception as exc:
            elapsed = time.time() - t
            print(f"  [{label}] {elapsed:.1f}s — HATA: {exc}", flush=True)
            timings[f"scrapper:{source}"] = elapsed
            raise

    fetch_tasks = [
        _timed("Trendyol", "trendyol",    fetch_trendyol(trendyol_query, product_id)),
        _timed("HB      ", "hepsiburada", fetch_hepsiburada(hb_query, hb_sku)),
        _timed("QA      ", "qa",          fetch_qa(product_name, trendyol_id=product_id, hb_sku=hb_sku, trendyol_url=trendyol_url)),
    ]
    if not skip_forums:
        fetch_tasks.append(_timed("Forum   ", "forum",   fetch_forums(forum_query, direct=forum_direct)))
    if not skip_youtube:
        user_preferences = "ürün özellikleri, kalite, kullanıcı deneyimi, fiyat performans"
        fetch_tasks.append(_timed("YouTube ", "youtube", process_multiple_videos(product_name, user_preferences, max_results=4)))

    # Fiyat geçmişi (Akakce/Cimri)
    from tools.price_history import fetch_price_history
    fetch_tasks.append(_timed("PriceHist", "price_data", fetch_price_history(product_name)))

    results = await asyncio.gather(*fetch_tasks, return_exceptions=True)

    # Sonuçları ayır
    idx = 0
    trendyol_reviews = results[idx] if not isinstance(results[idx], Exception) else []; idx += 1
    hb_reviews = results[idx] if not isinstance(results[idx], Exception) else []; idx += 1
    qa_items = results[idx] if not isinstance(results[idx], Exception) else []; idx += 1
    forum_posts = (results[idx] if not isinstance(results[idx], Exception) else []) if not skip_forums else []; idx += (0 if skip_forums else 1)
    youtube_videos = (results[idx] if not isinstance(results[idx], Exception) else []) if not skip_youtube else []; idx += (0 if skip_youtube else 1)
    price_data = results[idx] if not isinstance(results[idx], Exception) else {}

    # Hata raporla
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            print(f"  [Uyarı] Kaynak {i} hatası: {r}")
            from tools.youtube import YouTubeRateLimitError
            if isinstance(r, YouTubeRateLimitError):
                print("  [Kritik] YouTube rate limit engeli tespit edildi! İslem kuyruga geri atilmalidir.")
                raise r

    t_collect = time.time() - t0

    # Yorum fotoğraflarını indir (Hız için opsiyonel)
    if not skip_photos and isinstance(trendyol_reviews, list):
        from tools.review_photos import download_review_photos
        output_path = Path(output_dir) / product_name.replace(" ", "_")
        await asyncio.gather(
            download_review_photos(trendyol_reviews, output_path, "Trendyol", max_photos=100),
            download_review_photos(hb_reviews if isinstance(hb_reviews, list) else [], output_path, "HB", max_photos=50),
            return_exceptions=True,
        )

    # Hepsiburada özet verisini (Featured Features) ayıkla
    hb_summary = None
    if isinstance(hb_reviews, list) and hb_reviews and hb_reviews[0].get("is_summary"):
        hb_summary = hb_reviews.pop(0).get("data")

    # 3. Birleşik yorum havuzu
    all_reviews = list(trendyol_reviews) + list(hb_reviews) + [
        {"text": p["text"], "source": p["source"], "rating": None, "date": None}
        for p in (forum_posts if isinstance(forum_posts, list) else [])
        if len(p.get("text", "")) > 20
    ]

    data = {
        "product_name": product_name,
        "collected_at": datetime.now().isoformat(timespec="seconds"),
        "collection_time_sec": round(t_collect, 2),
        "timings": timings,
        "sources": {
            "trendyol": len(trendyol_reviews) if isinstance(trendyol_reviews, list) else 0,
            "hepsiburada": len(hb_reviews) if isinstance(hb_reviews, list) else 0,
            "qa_items": len(qa_items) if isinstance(qa_items, list) else 0,
            "forum_posts": len(forum_posts) if isinstance(forum_posts, list) else 0,
            "youtube_videos": len(youtube_videos) if isinstance(youtube_videos, list) else 0,
        },
        "ecommerce_reviews": (trendyol_reviews if isinstance(trendyol_reviews, list) else [])
            + (hb_reviews if isinstance(hb_reviews, list) else []),
        "hb_summary": hb_summary,
        "qa_items": qa_items if isinstance(qa_items, list) else [],
        "forum_posts": forum_posts if isinstance(forum_posts, list) else [],
        "youtube_videos": youtube_videos if isinstance(youtube_videos, list) else [],
        "price_data": price_data,
        "all_reviews": all_reviews,
    }

    # 4. Duplicate/null temizliği
    from tools.cleaner import clean_all
    data = clean_all(data)
    cs = data.get("cleaner_stats", {})
    for k, v in cs.items():
        if v.get("removed_duplicate") or v.get("removed_null"):
            print(f"  [Temizlik] {k}: {v['total']}->{v['final']} ({v.get('removed_null',0)} null, {v.get('removed_duplicate',0)} duplicate, {v.get('removed_short',0)} short)")

    # 5. Dosyalara kaydet
    _save(product_name, data, output_dir)

    # Özet
    src = data["sources"]
    yt_segments = sum(len(v.get("segments", [])) for v in (youtube_videos if isinstance(youtube_videos, list) else []))
    ty_reviews = [r for r in data.get("ecommerce_reviews", []) if r.get("source") == "trendyol"]
    hb_reviews = [r for r in data.get("ecommerce_reviews", []) if r.get("source") == "hepsiburada"]
    ty_photo_reviews = sum(1 for r in ty_reviews if r.get("local_photos"))
    hb_photo_reviews = sum(1 for r in hb_reviews if r.get("local_photos"))
    tc = tavily_count()
    print(f"\n{'='*60}")
    print(f"TAMAMLANDI ({t_collect:.1f}s)")
    print(f"  Trendyol     : {src['trendyol']} yorum ({ty_photo_reviews} fotografli)")
    print(f"  Hepsiburada  : {src['hepsiburada']} yorum ({hb_photo_reviews} fotografli)")
    print(f"  YouTube      : {src['youtube_videos']} video ({yt_segments} önemli bölüm)")
    print(f"  Soru-Cevap   : {src['qa_items']} adet")
    print(f"  Forum        : {src['forum_posts']} gonderi")
    print(f"  Toplam       : {len(all_reviews)} kayit")
    print(f"  Tavily API   : {tc} cagri (limit: 12/urun)")
    print(f"{'='*60}")

    return data


# ---------------------------------------------------------------------------
# Çıktı oluşturucular
# ---------------------------------------------------------------------------

def build_ai_input(data: dict) -> dict:
    """
    AI ajanlarının doğrudan tüketebileceği normalize format.
    Sprint doc'taki ProductState şemasıyla uyumlu (schema_version 3.0).
    """
    src = data["sources"]
    return {
        "product_name": data["product_name"],
        "collected_at": data["collected_at"],
        "collection_time_sec": data["collection_time_sec"],
        "data_sources": {
            "trendyol_review_count": src["trendyol"],
            "hepsiburada_review_count": src["hepsiburada"],
            "qa_item_count": src.get("qa_items", 0),
            "forum_post_count": src["forum_posts"],
            "youtube_video_count": src["youtube_videos"],
            "total_records": len(data["all_reviews"]),
        },
        # E-ticaret yorumları — sahte yorum tespiti, fiyat analizi için
        "ecommerce_reviews": data["ecommerce_reviews"],

        # Soru-cevap — ürün hakkında sıkça sorulan sorular ve satıcı yanıtları
        "qa_items": [
            {
                "question": q.get("question", ""),
                "answer": q.get("answer", ""),
                "answerer": q.get("answerer"),
                "date": q.get("date"),
                "source": q.get("source", ""),
            }
            for q in data.get("qa_items", [])
            if q.get("question")
        ],

        # Forum gönderileri — gerçek kullanıcı deneyimleri
        "forum_posts": [
            {
                "text": p["text"],
                "url": p.get("url", ""),
                "title": p.get("title", ""),
                "source": p.get("source", "forum"),
            }
            for p in data["forum_posts"]
        ],

        # YouTube — video analizi, tam tam transkript ve yorumlar
        "youtube_videos": [
            {
                "video_id": v.get("id", ""),
                "title": v.get("title", ""),
                "url": v.get("url", ""),
                "channel": v.get("channel", ""),
                "channel_url": v.get("channel_url", ""),
                "subscriber_count": v.get("subscriber_count"),
                "transcript": v.get("transcript", ""),
                "has_transcript": bool(v.get("transcript")),
                "segments": v.get("segments", []),
                "has_segments": len(v.get("segments", [])) > 0,
                "comments": v.get("comments", []),
            }
            for v in data["youtube_videos"]
        ],

        # Birleşik havuz — genel sentiment/sahte yorum analizi için
        "all_reviews": data["all_reviews"],

        "hb_summary": data.get("hb_summary"),
        
        "price_data": data.get("price_data", {}),

        "schema_version": "3.0",
        "timings": data.get("timings", {}),
    }


def build_markdown(data: dict) -> str:
    """Gemini'ye doğrudan gönderilebilir markdown özeti."""
    src = data["sources"]
    lines = [
        f"# ANALİZ GİRDİSİ: {data['product_name']}",
        f"\n**Toplama Tarihi:** {data['collected_at']}  ",
        f"**Toplama Süresi:** {data['collection_time_sec']} saniye\n",
        "## Kaynak Özeti",
        "| Kaynak | Adet |",
        "|--------|------|",
        f"| Trendyol yorumları | {src['trendyol']} |",
        f"| Hepsiburada yorumları | {src['hepsiburada']} |",
        f"| Soru-Cevap | {src.get('qa_items', 0)} |",
        f"| Forum gönderileri | {src['forum_posts']} |",
        f"| YouTube videoları | {src['youtube_videos']} |",
        f"| **Toplam** | **{len(data['all_reviews'])}** |",
        "",
    ]

    # Hepsiburada Özet (Öne Çıkan Özellikler)
    hb_sum = data.get("hb_summary")
    if hb_sum:
        lines.append("## Hepsiburada Öne Çıkan Özellikler (Yorum Puanlamaları)\n")
        lines.append("| Özellik | Puan |")
        lines.append("|---------|------|")
        for key, val in hb_sum.items():
            label = key.replace("_", " ").title()
            lines.append(f"| {label} | ★{val} |")
        lines.append("")

    # E-ticaret yorumları
    ecommerce = data["ecommerce_reviews"]
    if ecommerce:
        trendyol_r = [r for r in ecommerce if r.get("source") == "trendyol"]
        hb_r = [r for r in ecommerce if r.get("source") == "hepsiburada"]

        if trendyol_r:
            lines.append(f"## Trendyol Yorumları ({len(trendyol_r)} adet)\n")
            for r in trendyol_r:
                rating = f"★{r['rating']} " if r.get("rating") else ""
                lines.append(f"- {rating}{r['text']}")
            lines.append("")

        if hb_r:
            lines.append(f"## Hepsiburada Yorumları ({len(hb_r)} adet)\n")
            for r in hb_r:
                rating = f"★{r['rating']} " if r.get("rating") else ""
                lines.append(f"- {rating}{r['text']}")
            lines.append("")

    # Soru-Cevap bölümü
    qa_items = data.get("qa_items", [])
    if qa_items:
        lines.append(f"## Soru-Cevap ({len(qa_items)} adet)\n")
        for q in qa_items:
            src_tag = f"[{q.get('source', '')}] " if q.get("source") else ""
            lines.append(f"**S: {q.get('question', '')}**")
            answer = q.get("answer", "")
            answerer = q.get("answerer", "")
            if answer:
                who = f" ({answerer})" if answerer else ""
                lines.append(f"C{who}: {answer}")
            lines.append("")

    # Forum tartışmaları
    if data["forum_posts"]:
        lines.append(f"## Forum Tartışmaları ({len(data['forum_posts'])} gönderi)\n")
        for p in data["forum_posts"]:
            title = f"**{p.get('title', '')}** — " if p.get("title") else ""
            lines.append(f"- [{p.get('source', 'forum')}] {title}{p['text']}")
        lines.append("")

    # YouTube incelemeleri
    if data["youtube_videos"]:
        lines.append(f"## YouTube İncelemeleri ({len(data['youtube_videos'])} video)\n")
        for v in data["youtube_videos"]:
            lines.append(f"### {v.get('title', 'Başlıksız')}")
            lines.append(f"- **Link:** {v.get('url', '')}")
            transcript = v.get("transcript", "")
            if transcript:
                lines.append(f"- **Transkript:**\n\n{transcript}\n")
            segments = v.get("segments", [])
            if segments:
                lines.append(f"- **Önemli Bölümler:**")
                for s in segments:
                    lines.append(f"  - [{s.get('start', '')}s - {s.get('end', '')}s]: {s.get('reason', '')}")
            lines.append("")

    return "\n".join(lines)


def _save(product_name: str, data: dict, output_dir: str) -> None:
    slug = re.sub(r'[<>:"/\\|?*]', "_", product_name).replace(" ", "_")
    product_dir = Path(output_dir) / slug
    product_dir.mkdir(parents=True, exist_ok=True)

    ai = build_ai_input(data)

    try:
        # ── 1. raw/ klasörü oluştur ve ham verileri kaydet ──
        raw_dir = product_dir / "raw"
        raw_dir.mkdir(exist_ok=True)

        # Ham JSON dosyaları
        (raw_dir / "ecommerce_all.json").write_text(json.dumps(data.get("ecommerce_reviews", []), ensure_ascii=False, indent=2), encoding="utf-8")
        (raw_dir / "forum_all.json").write_text(json.dumps(data.get("forum_posts", []), ensure_ascii=False, indent=2), encoding="utf-8")
        (raw_dir / "youtube_all.json").write_text(json.dumps(data.get("youtube_videos", []), ensure_ascii=False, indent=2), encoding="utf-8")
        (raw_dir / "qa_all.json").write_text(json.dumps(data.get("qa_items", []), ensure_ascii=False, indent=2), encoding="utf-8")
        (raw_dir / "full_archive.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

        # ── 2. AI Analiz Dosyaları (Root klasörde) ─────────
        
        # Tam metin (Markdown)
        (product_dir / "gemini_full_content.md").write_text(
            build_markdown(data),
            encoding="utf-8",
        )

        # Damıtılmış metin (AI READY)
        t_distill = time.time()
        distilled = distill_data(data)
        (product_dir / "gemini_distilled_input.md").write_text(
            distilled,
            encoding="utf-8",
        )
        data.setdefault("timings", {})["scrapper:distill_data"] = time.time() - t_distill

        # ── 3. images/ ───────────────
        t_visuals = time.time()
        generate_visuals(data, product_dir / "images")
        data.setdefault("timings", {})["scrapper:generate_visuals"] = time.time() - t_visuals

        print(f"\n  Cikti klasoru: {product_dir.resolve()}")
        print(f"  Ham veriler  : raw/ klasöründe saklandı.")
        print(f"  AI Hazır     : gemini_distilled_input.md (Rafine edilmiş)")
    except (OSError, PermissionError) as e:
        print(f"  [Hata] Dosya yazma hatasi ({product_dir}): {e}")


if __name__ == "__main__":
    import sys
    
    product = "JBL T520BT"
    if len(sys.argv) > 1:
        product = " ".join(sys.argv[1:])
        
    asyncio.run(collect(product))
