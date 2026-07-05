---
Benchmark Sonuçları — iPhone 15 128GB (tek çalıştırma, 19.9s)

Kaynak Bazında Süre ve Hacim

┌──────────────┬───────┬─────────────┬──────────────────────────────────────┐
│    Kaynak    │ Süre  │   Çekilen   │            Limit tavanı?             │
├──────────────┼───────┼─────────────┼──────────────────────────────────────┤
│ Trendyol     │ 3.5s  │ 743 yorum   │ ✅ VURULDU — 6 ID × 250 max = tavan  │
├──────────────┼───────┼─────────────┼──────────────────────────────────────┤
│ Hepsiburada  │ 4.6s  │ 758 yorum   │ ✅ VURULDU — 8 SKU × 250 max = tavan │
├──────────────┼───────┼─────────────┼──────────────────────────────────────┤
│ QA           │ 3.5s  │ 153 kayıt   │ Hayır                                │
├──────────────┼───────┼─────────────┼──────────────────────────────────────┤
│ Forum        │ 5.9s  │ 689 gönderi │ Kısmen                               │
├──────────────┼───────┼─────────────┼──────────────────────────────────────┤
│ YouTube      │ 14.4s │ 2 video     │ ✅ VURULDU — max_results=2 sabit     │
├──────────────┼───────┼─────────────┼──────────────────────────────────────┤
│ PriceHistory │ 3.2s  │ 0 kayıt     │ —                                    │
├──────────────┼───────┼─────────────┼──────────────────────────────────────┤
│ TOPLAM       │ 19.9s │ 2190 kayıt  │ —                                    │
└──────────────┴───────┴─────────────┴──────────────────────────────────────┘

Forum Sitesi Bazında Detay

┌─────────────────────────┬──────────┬───────────┬────────────────┬─────────────────────────────────────┐
│          Site           │   Süre   │ Ham Kayıt │ Filtre Sonrası │                Sorun                │
├─────────────────────────┼──────────┼───────────┼────────────────┼─────────────────────────────────────┤
│ forum.shiftdelete.net   │ 3.9–4.3s │ 719       │ ~719           │ — Çalışıyor                         │
├─────────────────────────┼──────────┼───────────┼────────────────┼─────────────────────────────────────┤
│ technopat.net           │ 4.1–4.4s │ 125       │ 119            │ — Çalışıyor                         │
├─────────────────────────┼──────────┼───────────┼────────────────┼─────────────────────────────────────┤
│ forum.donanimarsivi.com │ 4.2–4.4s │ 100       │ 99             │ — Çalışıyor                         │
├─────────────────────────┼──────────┼───────────┼────────────────┼─────────────────────────────────────┤
│ kizlarsoruyor.com       │ 3.8–4.0s │ 30        │ 9              │ Düşük alaka                         │
├─────────────────────────┼──────────┼───────────┼────────────────┼─────────────────────────────────────┤
│ sikayetvar.com          │ 0.5s     │ 40        │ 2              │ Çok hızlı ama filtreden zor geçiyor │
├─────────────────────────┼──────────┼───────────┼────────────────┼─────────────────────────────────────┤
│ reddit.com              │ 3.2s     │ 20        │ 5              │ Düşük alaka                         │
├─────────────────────────┼──────────┼───────────┼────────────────┼─────────────────────────────────────┤
│ pchocasi.com.tr         │ 3.5s     │ 30        │ 0              │ Tamamen elendi                      │
├─────────────────────────┼──────────┼───────────┼────────────────┼─────────────────────────────────────┤
│ donanimhaber.com        │ 5.0–5.2s │ 0         │ 0              │ 🔴 JS-render, HTML parse boş        │
├─────────────────────────┼──────────┼───────────┼────────────────┼─────────────────────────────────────┤
│ webtekno.com            │ 3.2–3.9s │ 0         │ 0              │ 🔴 404 — URL formatı değişmiş       │
├─────────────────────────┼──────────┼───────────┼────────────────┼─────────────────────────────────────┤
│ eksisozluk.com          │ 3.2s     │ 0         │ 0              │ 🔴 404 — endpoint değişmiş          │
├─────────────────────────┼──────────┼───────────┼────────────────┼─────────────────────────────────────┤
│ instela.com             │ 4.0–4.1s │ 0         │ 0              │ 🔴 DNS çözümlenemedi (site kapalı?) │
├─────────────────────────┼──────────┼───────────┼────────────────┼─────────────────────────────────────┤
│ forum.chip.com.tr       │ 4.9–5.1s │ 0         │ 0              │ 🔴 0 sonuç                          │
└─────────────────────────┴──────────┴───────────┴────────────────┴─────────────────────────────────────┘

YouTube Video Bazında

┌─────────────┬───────┬────────────┬─────────┐
│  Video ID   │ Süre  │ Transkript │ Segment │
├─────────────┼───────┼────────────┼─────────┤
│ 6_DVLhxatSw │ 5.2s  │ ✅         │ 3       │
├─────────────┼───────┼────────────┼─────────┤
│ 0gxJCHW_wdM │ 11.2s │ ✅         │ 3       │
└─────────────┴───────┴────────────┴─────────┘

Yavaş video: Gemini segment extraction dominanttı.

---
Analiz — Seni Kandıran Yerler

1. 🔴 Kritik Yol: YouTube (14.4s — toplam sürenin %72'si)

Tüm diğer kaynaklar ~5s'de biterken YouTube 14.4s sürüyor. Sebebi: her video için sırayla transkript → Gemini API çağrısı. Şu anda sadece 2 video çekiliyor (collector.py:168). Rakam görünce "2 video yeterli"
 sanılıyor ama piyasada yüzlerce iPhone 15 inceleme videosu var. Tek değişiklikle max_results=2→8 yapılsa kolayca daha fazla kaynak.

2. 🔴 Donanimhaber.com: Hiç Veri Yok (5s harcandı, 0 kayıt)

Türkiye'nin en büyük teknik forumu — ama JS-render yüzünden HTML parse boş dönüyor. 5 saniye harcandı, hiçbir şey çekilemedi. Sitede yüzlerce iPhone 15 başlığı var. Bu büyük hacim kaybı.

3. 🔴 Eksisözlük / Webtekno / Instela: Ölü Kaynaklar

- eksisozluk.com: 404 — endpoint URL'si değişmiş. Geniş bir kitleye ulaşan Türkçe platform, şu an tamamen devre dışı.
- webtekno.com: 404 — /search/ ve /?s= formatları da reddediyor. Güncel format bulunmalı.
- instela.com: DNS çözümleme başarısız — site muhtemelen artık yok. Listeden çıkarılmalı.

4. 🟡 Trendyol/HB Tavan: 250/contentId, gerçekte 10x fazlası var

Her contentId'de tam 250 (5 sayfa × 50) çekildi ve durdu. iPhone 15'in gerçek yorum sayısı on binler. max_pages=5→20 yapılsa ve daha fazla varyant ID keşfedilse (şu an max 3) kayıt sayısı kolayca 3-5x
artabilir. Ancak hız da artacak.

5. 🟡 forum.shiftdelete.net Hakimiyeti

689 forum gönderisinin 719'u tek bir siteden (shiftdelete.net). Çeşitlilik yok — diğer 4 işlevsel site zayıf kalıyor. Gerçek topluluk görüşü tek siteden geliyor.

---
İyileştirme Önerileri (öncelik sırasıyla)

┌─────────┬────────────────────────────────────────────────────────────┬────────────────────┬──────────────────────────┬──────────────────────────┐
│ Öncelik │                         Değişiklik                         │    Dosya:Satır     │     Tahmini Kazanım      │        Hız Etkisi        │
├─────────┼────────────────────────────────────────────────────────────┼────────────────────┼──────────────────────────┼──────────────────────────┤
│ 🔴 P1   │ donanimhaber Tavily fallback ekle (JS engelini aş)         │ forums.py          │ +50–200 gönderi          │ Nötr                     │
├─────────┼────────────────────────────────────────────────────────────┼────────────────────┼──────────────────────────┼──────────────────────────┤
│ 🔴 P1   │ eksisozluk.com endpoint URL'sini güncelle                  │ forums.py:920      │ +10–50 entry             │ Nötr                     │
├─────────┼────────────────────────────────────────────────────────────┼────────────────────┼──────────────────────────┼──────────────────────────┤
│ 🔴 P1   │ instela.com'u forum listesinden kaldır                     │ forums.py:508-521  │ 8s tasarruf (4s×2 query) │ ✅ Hızlanır              │
├─────────┼────────────────────────────────────────────────────────────┼────────────────────┼──────────────────────────┼──────────────────────────┤
│ 🟡 P2   │ YouTube max_results=2→6 + Gemini paralel API key rotasyonu │ collector.py:168   │ +4–8 video               │ +3–8s (kabul edilebilir) │
├─────────┼────────────────────────────────────────────────────────────┼────────────────────┼──────────────────────────┼──────────────────────────┤
│ 🟡 P2   │ Trendyol max_pages=5→15 + varyant ID cap 3→8               │ trendyol.py:83,263 │ +500–1500 yorum          │ +3–5s (paralel)          │
├─────────┼────────────────────────────────────────────────────────────┼────────────────────┼──────────────────────────┼──────────────────────────┤
│ 🟡 P2   │ HB max_pages=5→15                                          │ hepsiburada.py:22  │ +500–1500 yorum          │ +2–3s (semaphore var)    │
├─────────┼────────────────────────────────────────────────────────────┼────────────────────┼──────────────────────────┼──────────────────────────┤
│ 🟢 P3   │ webtekno.com search URL formatını güncelle                 │ forums.py:1142     │ +20–80 gönderi           │ Nötr                     │
├─────────┼────────────────────────────────────────────────────────────┼────────────────────┼──────────────────────────┼──────────────────────────┤
│ 🟢 P3   │ Yavaş/boş forum siteleri için early-timeout (3s)           │ forums.py:537-543  │ Toplam -2s               │ ✅ Hızlanır              │
├─────────┼────────────────────────────────────────────────────────────┼────────────────────┼──────────────────────────┼──────────────────────────┤
│ 🟢 P3   │ QA limit artışı (HB 100→300, TY 150→500)                   │ qa.py:123,177      │ +200–500 kayıt           │ +1–2s                    │
└─────────┴────────────────────────────────────────────────────────────┴────────────────────┴──────────────────────────┴──────────────────────────┘

Acil iki değişiklik (bu turda yapılmaz ama tek satır düzeltmeler):
1. instela.com listeden çıkarmak → 0 kayıt için 8s harcama son bulur, süre ~12s'ye iner
2. YouTube max_results=2→6 → collector.py:168 tek satır, en yüksek bilgi kalitesi kazanımı

---
Instrumentation tamamen geri alındı, scrapper kodu orijinal haline döndü. Benchmark çıktısı C:\tmp\benchmark_out\iPhone_15_128GB\ altında mevcut. Sıradaki adım olarak hangi iyileştirmeden başlamak istediğini
 söylersen uygularız.