import re
from collections import Counter

def distill_data(data: dict, max_reviews: int = 150, max_forum_posts: int = 50) -> str:
    """
    Veriyi yapay zeka (Gemini/GPT) için damıtır:
    1. Düşük kaliteli (kısa/anlamsız) yorumları eler.
    2. En bilgilendirici yorumları (uzunluk ve anahtar kelimeye göre) seçer.
    3. Önemli anahtar kelimeleri ve sentiment sinyallerini öne çıkarır.
    """
    
    # 1. Kaynakları Hazırla
    ecommerce = data.get("ecommerce_reviews", [])
    forum = data.get("forum_posts", [])
    youtube = data.get("youtube_videos", [])
    qa = data.get("qa_items", [])
    hb_summary = data.get("hb_summary", {})

    # 2. Kalite Puanlaması ve Filtreleme
    def score_content(text: str) -> int:
        if not text: return 0
        score = len(text) // 10  # Uzunluk önemli
        # Bilgi yoğunluğu işaretleri
        informative_words = ["çünkü", "ancak", "ama", "fakat", "özellikle", "şarj", "ekran", "kamera", "ses", "performans", "ısınma"]
        for word in informative_words:
            if word in text.lower():
                score += 20
        # Ünlem veya soru işareti içerenler genelde duygu yüklüdür
        if "!" in text or "?" in text:
            score += 10
        return score

    # E-ticaret yorumlarını puanla ve en iyileri seç
    scored_ecom = sorted(
        [{"text": r["text"], "score": score_content(r["text"]), "rating": r.get("rating"), "source": r.get("source")} 
         for r in ecommerce],
        key=lambda x: x["score"],
        reverse=True
    )
    # Filtre: Çok kısa veya anlamsızları tamamen at
    scored_ecom = [r for r in scored_ecom if r["score"] > 30]
    top_ecom = scored_ecom[:max_reviews]

    # Forum gönderilerini puanla ve en iyileri seç
    scored_forum = sorted(
        [{"text": p["text"], "score": score_content(p["text"]), "title": p.get("title"), "source": p.get("source")} 
         for p in forum],
        key=lambda x: x["score"],
        reverse=True
    )
    scored_forum = [p for p in scored_forum if p["score"] > 50] # Forumlarda beklenti daha yüksek
    top_forum = scored_forum[:max_forum_posts]

    # 3. Anahtar Kelime Analizi (Basit)
    def extract_keywords(texts: list[str]) -> list[tuple[str, int]]:
        words = []
        stop_words = {"ve", "bir", "çok", "bu", "da", "de", "için", "ama", "en", "daha", "kadar", "olan", "ki", "ile"}
        for t in texts:
            # Sadece harf ve sayı
            w_list = re.findall(r'\b\w{4,}\b', t.lower())
            words.extend([w for w in w_list if w not in stop_words])
        return Counter(words).most_common(20)

    all_texts = [r["text"] for r in top_ecom] + [p["text"] for p in top_forum]
    top_keywords = extract_keywords(all_texts)

    # 4. Markdown Oluşturma (AI Optimized)
    md = []
    md.append(f"# AI ANALİZ RAPORU: {data['product_name']}")
    md.append(f"\n> **Veri Özeti:** Toplam {len(ecommerce) + len(forum)} kayıt içerisinden en bilgilendirici {len(top_ecom) + len(top_forum)} adet seçilmiştir.")
    
    if hb_summary:
        md.append("\n## Platform Puanlamaları (Hepsiburada)")
        for k, v in hb_summary.items():
            md.append(f"- {k.replace('_', ' ').title()}: ★{v}")

    md.append("\n## Sık Geçen Kavramlar")
    md.append(", ".join([f"{k} ({c})" for k, c in top_keywords]))

    md.append("\n## YouTube İnceleme Özetleri")
    for v in youtube[:3]: # En fazla 3 video özeti
        md.append(f"### {v.get('title')}")
        transcript = v.get("transcript", "")
        if transcript:
            # Transkript çok uzunsa ilk 2000 karakteri al (Özet için yeterli)
            md.append(f"- **Transkript Özet:** {transcript[:2000]}...")
        if v.get("comments"):
            # En iyi 5 yorumu al
            sorted_comments = sorted(v["comments"], key=lambda x: len(x.get("text", "")), reverse=True)
            md.append("- **Önemli Yorumlar:**")
            for c in sorted_comments[:5]:
                md.append(f"  - {c['text']}")

    md.append("\n## Seçilmiş Kullanıcı Deneyimleri (E-Ticaret)")
    for r in top_ecom:
        rating_str = f" ★{r['rating']}" if r['rating'] else ""
        md.append(f"- [{r['source']}{rating_str}] {r['text']}")

    md.append("\n## Kritik Forum Tartışmaları")
    for p in top_forum:
        title_str = f"**{p['title']}** — " if p['title'] else ""
        md.append(f"- [{p['source']}] {title_str}{p['text']}")

    if qa:
        md.append("\n## Önemli Soru-Cevaplar")
        for item in qa[:20]: # En önemli 20 soru
            md.append(f"**S:** {item['question']}\n**C:** {item['answer']}")

    return "\n".join(md)
