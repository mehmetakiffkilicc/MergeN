"""Ürün inceleme görselleştirici — matplotlib ile PNG grafik üretir."""
from collections import Counter, defaultdict
from pathlib import Path


def generate_visuals(data: dict, output_dir: Path) -> list[str]:
    """
    Toplanan veriden PNG grafikler üretir.
    Returns: oluşturulan dosyaların yolları.
    matplotlib yoksa sessizce boş liste döner.
    """
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("  [Gorsel] matplotlib yuklu degil, atlanıyor")
        return []

    output_dir.mkdir(parents=True, exist_ok=True)
    created: list[str] = []
    product_name = data.get("product_name", "Urun")
    sources = data.get("sources", {})
    ecommerce = data.get("ecommerce_reviews", [])

    # ---- 1. Puan dağılımı ----
    ratings = [r["rating"] for r in ecommerce if r.get("rating")]
    if ratings:
        fig, ax = plt.subplots(figsize=(8, 5))
        counter = Counter(int(r) for r in ratings)
        stars = list(range(1, 6))
        counts = [counter.get(s, 0) for s in stars]
        colors = ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#27ae60"]
        bars = ax.bar([f"{s} Yildiz" for s in stars], counts, color=colors, edgecolor="white")
        ax.set_title(f"{product_name} — Puan Dagilimi", fontsize=14, fontweight="bold")
        ax.set_xlabel("Puan")
        ax.set_ylabel("Yorum Sayisi")
        for bar, count in zip(bars, counts):
            if count > 0:
                ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.3,
                        str(count), ha="center", va="bottom", fontweight="bold")
        total = sum(counts)
        avg = sum(s * counter.get(s, 0) for s in stars) / total if total else 0
        ax.text(0.98, 0.95, f"Ort: {avg:.1f}/5\nToplam: {total}",
                transform=ax.transAxes, ha="right", va="top",
                bbox=dict(boxstyle="round", facecolor="wheat", alpha=0.6))
        plt.tight_layout()
        p = output_dir / "rating_distribution.png"
        fig.savefig(p, dpi=150, bbox_inches="tight")
        plt.close(fig)
        created.append(str(p))

    # ---- 2. Kaynak dağılımı ----
    src_data = {
        "Trendyol": sources.get("trendyol", 0),
        "Hepsiburada": sources.get("hepsiburada", 0),
        "Forum": sources.get("forum_posts", 0),
        "YouTube": sources.get("youtube_videos", 0),
    }
    src_filtered = {k: v for k, v in src_data.items() if v > 0}
    if src_filtered:
        fig, ax = plt.subplots(figsize=(7, 7))
        colors_map = {
            "Trendyol": "#e74c3c",
            "Hepsiburada": "#f39c12",
            "Forum": "#3498db",
            "YouTube": "#9b59b6",
        }
        pie_colors = [colors_map[k] for k in src_filtered]
        wedges, texts, autotexts = ax.pie(
            list(src_filtered.values()),
            labels=list(src_filtered.keys()),
            autopct="%1.0f%%",
            colors=pie_colors,
            startangle=90,
            pctdistance=0.82,
        )
        for t in autotexts:
            t.set_fontweight("bold")
        total_all = sum(src_filtered.values())
        ax.set_title(f"{product_name}\nKaynak Dagilimi (Toplam: {total_all})",
                     fontsize=13, fontweight="bold")
        p = output_dir / "source_distribution.png"
        fig.savefig(p, dpi=150, bbox_inches="tight")
        plt.close(fig)
        created.append(str(p))

    # ---- 3. Aylık yorum trendi ----
    all_dated = [r for r in ecommerce if r.get("date")]
    if len(all_dated) >= 5:
        monthly: dict = defaultdict(int)
        for r in all_dated:
            try:
                monthly[r["date"][:7]] += 1
            except Exception:
                pass
        if len(monthly) >= 3:
            months = sorted(monthly.keys())[-24:]
            counts_m = [monthly[m] for m in months]
            fig, ax = plt.subplots(figsize=(12, 5))
            ax.fill_between(range(len(months)), counts_m, alpha=0.25, color="#3498db")
            ax.plot(range(len(months)), counts_m, "o-", color="#3498db", linewidth=2, markersize=5)
            ax.set_xticks(range(len(months)))
            ax.set_xticklabels([m[2:] for m in months], rotation=45, ha="right", fontsize=9)
            ax.set_title(f"{product_name} — Aylik Yorum Trendi", fontsize=14, fontweight="bold")
            ax.set_xlabel("Ay")
            ax.set_ylabel("Yorum Sayisi")
            plt.tight_layout()
            p = output_dir / "review_timeline.png"
            fig.savefig(p, dpi=150, bbox_inches="tight")
            plt.close(fig)
            created.append(str(p))

    # ---- 4. Özet kartı ----
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.axis("off")

    ty_reviews = [r for r in ecommerce if r.get("source") == "trendyol"]
    hb_reviews = [r for r in ecommerce if r.get("source") == "hepsiburada"]
    ty_ratings_list = [r["rating"] for r in ty_reviews if r.get("rating")]
    hb_ratings_list = [r["rating"] for r in hb_reviews if r.get("rating")]
    ty_avg = sum(ty_ratings_list) / len(ty_ratings_list) if ty_ratings_list else None
    hb_avg = sum(hb_ratings_list) / len(hb_ratings_list) if hb_ratings_list else None

    ty_line = f"Trendyol    : {len(ty_reviews)} yorum" + (f"  (ort {ty_avg:.2f}/5)" if ty_avg else "")
    hb_line = f"Hepsiburada : {len(hb_reviews)} yorum" + (f"  (ort {hb_avg:.2f}/5)" if hb_avg else "")
    yt_videos = data.get("youtube_videos", [])
    yt_comments = sum(len(v.get("comments", [])) for v in yt_videos)

    summary = (
        f"Urun         : {product_name}\n"
        f"Toplama      : {data.get('collected_at','')[:16].replace('T', ' ')}\n"
        f"Sure         : {data.get('collection_time_sec', 0):.1f} saniye\n\n"
        f"{ty_line}\n"
        f"{hb_line}\n"
        f"Forum        : {sources.get('forum_posts', 0)} gonderi\n"
        f"YouTube      : {sources.get('youtube_videos', 0)} video  ({yt_comments} yorum)\n\n"
        f"Toplam kayit : {len(data.get('all_reviews', []))}"
    )
    ax.text(0.05, 0.95, summary, transform=ax.transAxes,
            fontsize=12, verticalalignment="top", fontfamily="monospace",
            bbox=dict(boxstyle="round,pad=0.8", facecolor="#ecf0f1", alpha=0.85))
    ax.set_title("Veri Toplama Ozeti", fontsize=16, fontweight="bold", pad=20)
    plt.tight_layout()
    p = output_dir / "summary.png"
    fig.savefig(p, dpi=150, bbox_inches="tight")
    plt.close(fig)
    created.append(str(p))

    names = [Path(c).name for c in created]
    print(f"  [Gorsel] {len(created)} grafik olusturuldu: {', '.join(names)}")
    return created
