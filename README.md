<div align="center">
  <img src="https://github.com/mehmetakiffkilicc/MergeN/blob/main/frontend/src/mergen%20logo.png" alt="MergeN Logo" width="300" onerror="this.src='https://img.icons8.com/color/150/000000/artificial-intelligence.png'"/>

 
  # MergeN: Alışveriş Röntgeni
  
  **"E-Ticaretteki İllüzyonu Kırın: Yapay Zeka Destekli Şeffaf Alışveriş Kararları!"**
  
  [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![LangGraph](https://img.shields.io/badge/LangGraph-FF4F00?style=for-the-badge&logo=python&logoColor=white)](https://langchain-ai.github.io/langgraph/)
</div>

 Youtube Demo Linki:https://youtu.be/YcPV8YE8uLA 
 
## 🎯 Projenin Amacı
Günümüzde e-ticaret siteleri, yanıltıcı değerlendirmeler, yapay indirimler ve sponsorlu içeriklerle doludur. Tüketiciler, bir ürünün gerçekten iyi mi olduğunu yoksa sadece iyi mi "pazarlandığını" anlamakta zorlanmaktadır. 

  İsmini Türk mitolojisinde her şeyi gören, her gerçeği hedefinden vuran Bilge Okçu Tanrısı  **MergeN**' den alan, e-ticaret ürünlerindeki manipülasyonları tespit eden **çok ajanlı (multi-agent)** bir yapay zeka sistemidir. Kullanıcı bir ürün adını veya URL'sini girdiğinde, MergeN internetteki tüm izleri (pazar yeri yorumları, forumlar, Reddit, YouTube incelemeleri ve fiyat geçmişi) derinlemesine analiz eder ve manipülasyonlardan arındırılmış, objektif bir **AL / KOŞULLU AL / ALMA** kararı üretir.

---

## ✨ Öne Çıkan Özellikler
- 🤖 **Çok Ajanlı AI Mimarisi:** LangGraph altyapısıyla çalışan 6 farklı uzman ajanın kümülatif zekası.
- 🧬 **Manipülasyon DNA'sı Analizi:** Yorum, yapay indirim, yanıltıcı görsel ve abartılı vaat tespiti.
- ⚖️ **Challenger Mekanizması:** Sistem, aldığı son kararı çürütmeye çalışan özel bir ajanla test ederek sıfır hata payı / maksimum tarafsızlık hedefler.
- 🌐 **Çoklu Veri Kaynağı:** Trendyol, Hepsiburada gibi platformların ötesine geçerek YouTube video transkriptlerini,başta teknoloji içerikleri olmak üzere tüm forumları ve Q&A kısımlarını tarar.
- ⚡ **Gerçek Zamanlı Karar Destek:** Kullanıcının ihtiyaç profiline göre kişiselleştirilmiş "Advisor" (Danışman) ajan entegrasyonu.

---

## 🏗️ LangGraph Mimarisi ve Veri Akışı

MergeN, sistemin merkezine **LangGraph** (StateGraph) teknolojisini yerleştirerek karmaşık karar alma mekanizmalarını kontrol edilebilir ve durum tabanlı (stateful) bir pipeline'a dönüştürür. 

### 🤔 Neden LangGraph?

MergeN'in mimarisi, birbirinden bağımsız çalışabilen ama aynı zamanda 
birbirine bağlı kararlar üretmesi gereken 6 ajan içeriyor. Bu yapı, 
klasik bir prompt zinciriyle yönetilemeyecek kadar 
karmaşık; çünkü:

- **Durum sürekliliği gerekiyor:** Yargucu(Advisor Agent), kullanıcıdan yanıt 
  beklerken pipeline'ın askıya alınması ve kaldığı yerden devam etmesi 
  şart. LangGraph'ın `MemorySaver` + `interrupt_before` mekanizması 
  bunu kutudan çıkar çıkmaz (out-of-the-box) sağlıyor.

- **Koşullu dallanma kritik:** Orchestrator, her aşamada hata durumunu 
  kontrol ederek gereksiz API çağrısını kesiyor. Bu tür dinamik 
  yönlendirme, CrewAI veya düz fonksiyon zincirlerinde elle kodlanması 
  gereken bir şey; LangGraph'ta birinci sınıf bir özellik.

- **Hata izolasyonu:** Her ajan node'u bağımsız hata yönetimine sahip 
  olduğundan, Research Agent'ta bir kaynak başarısız olursa sistem 
  çökmek yerine mevcut veriyle devam ediyor.

LangGraph'ın StateGraph yapısı, her ajanın ne ürettiğini ve neden o karara vardığını 
izlenebilir kılıyor — bu, bir karar destek sistemi için pazara çıkılabilirlik 
kadar kritik.

### 🔄 Ajanlar (Nodes) ve Görevleri
Sistemimiz, her biri belirli bir AI uzmanlığına sahip 6 farklı ajan node'undan (düğümünden) oluşmaktadır:

1. **Mergen Agent:** Projenin orkestratörü olan Mergen, LangGraph'ın yönlendirici (router) node'udur. Akışı yönetir ve ajanlar arası faz geçişlerini (`advance_phase`) sağlar. Herhangi bir adımda kritik bir hata tespit edilirse (`state["error"]`), gereksiz API maliyetlerini önlemek için sistemi anında `END` node'una yönlendirir (short-circuit).
2. **Tulpar Agent:** Efsanevi uçan at Tulpar gibi eşsiz bir hıza sahiptir. İnternetin derinliklerine dalarak Trendyol, Hepsiburada gibi pazar yerlerinden, bağımsız forumlardan ve YouTube video transkriptlerinden asenkron olarak ham veri toplar.
3. **Kam Agent (Röntgen):** Şaman (Kam) gibi yüzeyin altındakini görür. LangGraph state'ine giren verilerdeki gizli manipülasyonları ayrıştırır. 4 katmanlı (Yorum, Fiyat, Görsel, İddia)bir harita oluşturur ve her kaynaktan gelen ağırlıklı "Güven Skorunu" hesaplar.

Örnek Agent Veri Çıktısı:

```json

{
  "product_name": "Apple AirPods Pro (2. Nesil)",
  "product_url": "https://www.trendyol.com/apple/airpods-pro-2-nesil-p-3528741",
  "current_phase": "done",
  "error": null,
  "weighted_trust_score": {
    "total": 68.0,
    "forum_signal": 76.0,
    "youtube_signal": 64.0,
    "ecommerce_signal": 58.0,
    "claim_signal": 71.0
  },
  "manipulation_dna": {
    "review_layer": 42.0,
    "price_layer": 18.0,
    "visual_layer": 28.0,
    "claim_layer": 56.0
  },
  "xray": {
    "price_verification": {
      "real_discount": 6.0,
      "fake_discount_alert": true
    },
    "claims": [
      {
        "claim": "Aktif Gürültü Engelleme (ANC) bir önceki nesle göre 2 kata kadar daha fazla arka plan gürültüsünü engeller.",
        "reality": "Bağımsız testler ve kullanıcı analizlerine göre alt frekanslarda (motor, yol gürültüsü) gerçekten ~1.8x bir engelleme görülürken, insan sesi gibi orta frekanslarda fark %30 civarındadır.",
        "score": 0.72,
        "contrary_percentage": 28
      },
      {
        "claim": "Tek şarjla 6 saate kadar dinleme süresi ve şarj kutusuyla toplam 30 saat kullanım.",
        "reality": "Yüksek ses seviyesinde ve ANC ortamlarında tek şarj ortalama 5.5 saate inmektedir. Toplam kullanım ise YouTube ölçümlerinde ~22-24 saat aralığında kalmaktadır.",
        "score": 0.27,
        "contrary_percentage": 73
      },
      {
        "claim": "H2 çip sayesinde kusursuz bağlantı ve cihazlar arası anında geçiş.",
        "reality": "Apple ekosistemi içinde (iPhone ↔ Mac) kusursuz çalışmakta, ancak kalabalık Bluetooth ortamlarında veya eski cihazlarda anlık takılmalar (%8) rapor edilmiştir.",
        "score": 0.92,
        "contrary_percentage": 8
      }
    ],
    "data_gaps": [
      "price_history"
    ],
    "reviewers": [
      {
        "channel": "Teknoloji Rehberi",
        "handle": "@teknoloji.rehberi",
        "trust_score": 91.0,
        "tier": "trusted",
        "consistency": 94.0,
        "sponsorship_ratio": 6.0,
        "accuracy_delta": 14.0,
        "subscriber_count": 450000,
        "subscribers_label": "450B",
        "contribution": "Bu kanalın ANC ve ses ölçümleri referans alınmıştır. Analiz ağırlığı %42'dir.",
        "signals": [
          {
            "kind": "good",
            "text": "Kontrollü oda ve sektör standardı test ekipmanları kullanılmaktadır."
          },
          {
            "kind": "good",
            "text": "Sponsorlu içerik oranı %6 olup, endüstri ortalamasının oldukça altındadır."
          }
        ]
      },
      {
        "channel": "Kanal Tech",
        "handle": "@kanal.tech",
        "trust_score": 78.0,
        "tier": "neutral",
        "consistency": 86.0,
        "sponsorship_ratio": 18.0,
        "accuracy_delta": 8.0,
        "subscriber_count": 2100000,
        "subscribers_label": "2.1M",
        "contribution": "Kanalın batarya ölçüm verisi kullanılmıştır. Ağırlığı %38'dir.",
        "signals": [
          {
            "kind": "good",
            "text": "İncelemelerinde 3 ay sonraki deneyim videolarına yer verilmektedir."
          },
          {
            "kind": "warn",
            "text": "Sözel olarak 30 saat derken ekran görüntüsündeki pil widget'ında 22 saat görülmüştür."
          }
        ]
      }
    ],
    "xray_reveal": {
      "before": {
        "label": "YÜZEY · ÜRETİCİ GÖZÜ",
        "tag": "DOĞRULANMAMIŞ",
        "items": [
          "Etiket: 9.999 ₺ → 7.849 ₺ (%22 İndirim)",
          "Pil Ömrü: 30 Saat (Kutu Dahil)",
          "Gürültü Engelleme: 2x Güçlü ANC"
        ]
      },
      "after": {
        "label": "RÖNTGEN · GERÇEK",
        "tag": "GÜVEN 68/100",
        "items": [
          "Gerçek İndirim Oranı: %6 (Son 30 Günün Dibi: 7.400 ₺)",
          "Gerçek Pil Ömrü: 22 Saat 18 Dakika (YouTube + Forum Ölçümü)",
          "Gerçek Gürültü Engelleme: -34 dB (Donanım Avcısı Ölçümü)"
        ]
      }
    }
  },
  "image_verification": {
    "match_score": 96,
    "tier": "good",
    "label": "YÜKSEK UYUM",
    "manufacturer_image_url": "file:///C:/Users/Akif/Desktop/MergeN/frontend/src/assets/airpods_pro_2_studio.png",
    "real_image_url": "file:///C:/Users/Akif/Desktop/MergeN/frontend/src/assets/airpods_pro_2_real.png",
    "verdict": "Stüdyo görseli fiziksel gerçeği birebir dürüstlükle yansıtıyor. Yapay zeka karşılaştırmamızda, AirPods Pro 2'nin tüm ayırt edici dış tasarım bileşenleri (USB-C girişi, hoparlör ızgaraları, LED yerleşimi ve kutu içeriği) kusursuz bir şekilde eşleşmiştir.",
    "findings": [
      {
        "tier": "good",
        "pct": 98,
        "label": "Dış Geometri & Tasarım",
        "note": "Kulaklık ve kutu kıvrımları stüdyo render'ı ile tamamen örtüşmektedir."
      },
      {
        "tier": "good",
        "pct": 97,
        "label": "Şarj LED Konumu",
        "note": "Ön yüzdeki durum LED'inin konumu ve yeşil ışık yansıması birebir uyumludur."
      },
      {
        "tier": "good",
        "pct": 96,
        "label": "Konnektör Tasarımı",
        "note": "Lightning yerine yeni eklenen USB-C portunun fiziksel derinliği doğrulanmıştır."
      }
    ],
    "hotspots": [
      {
        "id": 1,
        "label": "Şarj Kutusu — LED & Üst Yüzey",
        "studio": { "x": 38, "y": 40 },
        "real": { "x": 30, "y": 25 }
      },
      {
        "id": 2,
        "label": "Konnektör & Kulaklık Sap Ucu",
        "studio": { "x": 72, "y": 68 },
        "real": { "x": 55, "y": 62 }
      }
    ]
  },
  "video_analysis": [
    {
      "video_url": "https://www.youtube.com/watch?v=uV_0l7AZpIs",
      "timestamp": "10:45-11:15",
      "channel": "Kanal Tech",
      "title": "AirPods Pro 2 İncelemesi — Batarya Performansı Testi",
      "duration": "12:27",
      "claimed_value": "30 Saat Pil Ömrü",
      "visible_value": "22 Saat 18 Dakika Gerçek Kullanım",
      "discrepancy": "0.26",
      "summary": "İncelemede batarya testinde üretici tarafından vadedilen 30 saatlik sürenin gerçek kullanımda ortalama 22 saat civarında kaldığı ekran üzerindeki şarj durum göstergeleriyle doğrulanmıştır."
    },
    {
      "video_url": "https://www.youtube.com/watch?v=GSwJK05PzEk",
      "timestamp": "10:22-10:50",
      "channel": "Gürültü Analizleri",
      "title": "AirPods Pro 2 Type-C — ANC Gürültü Denetim Testi",
      "duration": "15:50",
      "claimed_value": "2 Kat Daha Güçlü ANC",
      "visible_value": "Alt frekanslarda güçlü, insan sesinde normal ANC",
      "discrepancy": null,
      "summary": "Gürültü denetim modları testinde ANC performansı alt frekanslarda (motor, gürültü vb.) son derece başarılıyken insan sesinde beklendiği üzere sınırlıdır. İddia ile tutarlıdır."
    }
  ]
}
```

**Fiyat geçmişi verisi, Türkiye pazarı için **Akakçe**'nin kamuya açık fiyat takip altyapısından beslenerek "önce artır sonra indir" manipülasyonlarını tespit eder.**

4. **Bilge Agent:** Tulpar ve Kam'ın topladığı binlerce veriyi süzgeçten geçirir. Kategorik skorları belirler, ürünün zayıf/güçlü yönlerini matrisler halinde döker.
5. **Yargucu Agent:**Adaleti temsil eden Yargucu, kullanıcının bireysel ihtiyaçlarını anlamak için tasarlanmıştır. Önce dinamik sorular üretir, ardından LangGraph'ın **`interrupt_before`** özelliği kullanılarak pipeline duraklatılır ve kullanıcıdan yanıt alınır. State güncellendikten sonra kişiselleştirilmiş nihai kararını (AL / KOŞULLU AL / ALMA) üretir.
6. **Erlik Agent:** Yeraltı tanrısı Erlik'ten ilham alan bu ajan, Yapay zeka halüsinasyonlarını ve onaylama yanlılığını (confirmation bias) engellemek için tasarlanmış bağımsız bir denetim katmanıdır. Advisor'ın ürettiği karara karşı olası en güçlü karşı argümanları sistematik olarak oluşturur. Kararı doğrudan değiştirmez; bunun yerine tespit ettiği zayıf noktaları kullanıcıya **bağlamsal uyarı widget'ları** olarak sunar.

### 📊 Veri Kaynakları

| Kaynak | Toplanan Veri | Amaç |
|---|---|---|
| Trendyol / Hepsiburada | Ürün yorumları, Q&A, satıcı bilgisi | Yorum analizi |
| Akakçe | 90 günlük fiyat geçmişi | Sahte indirim tespiti |
| YouTube | Video transkriptleri | Sponsorlu içerik & görsel karşılaştırma |
| Technopat, DonanımHaber, Donanım Arşivi, Ekşisözlük, Şikayetvar | Organik kullanıcı deneyimleri | Doğrulama katmanı |
| Tavily Search | Gerçek zamanlı web taraması | Güncel şikayet ve haber tespiti |

### 🧠 State Yönetimi (ProductState) ve Akış
Tüm ajanlar birbirleriyle merkezi bir `ProductState` (TypedDict) üzerinden haberleşir. LangGraph'ın **MemorySaver (Checkpointing)** altyapısı kullanılarak tüm hafıza diske kaydedilir, bu sayede sistem kullanıcı yanıtı beklerken askıya alınabilir ve sonrasında kaldığı yerden devam edebilir. Akış Döngüsü:

`Mergen ➔ Tulpar ➔ Mergen ➔ Kam ➔ Mergen ➔ Bilge ➔ Mergen ➔ Yargucu ➔ Mergen ➔ Erlik ➔ END`

### 🛡️ Performans, Maliyet ve Hukuki Uyumluluk (Sürdürülebilirlik)

* **Gizlilik ve Veri Tutma Politikası:** Sistemimiz, e-ticaret platformlarındaki son kullanıcıların isim, kullanıcı adı, profil veya hesap bilgileri gibi hiçbir kişisel verisini sistemine dahil etmez ve çekmez. Research Agent mimarimiz, sadece kamuya açık anonim ürün yorumlarını ve metinsel değerlendirmeleri filtreleyerek işleme alır. Toplanan bu anonim veriler de sunucularımızda kalıcı olarak depolanmaz; LangGraph `MemorySaver` üzerindeki durum (state) sadece kullanıcının anlık oturumu (session) boyunca canlı tutulur ve analiz tamamlanıp nihai karar üretildiği an tamamen yok edilir. MergeN, bu veri minimizasyonu yaklaşımıyla KVKK ve GDPR prensiplerine tam uyumlu bir altyapıya sahiptir.

* **Etik ve Dağıtık Veri Toplama Mimarisi:** Hedef platformların sunucu altyapılarına ek yük bindirmemek ve servis sürekliliğine saygı göstermek adına, `Research Agent` tamamen asenkron, dinamik gecikme (adaptive delay) ve akıllı hız limitleri (rate-limiting) uygulayan bir mimariyle çalışır. Gelişmiş kimlik doğrulama (header) optimizasyonları ve dağıtık veri toplama teknikleri sayesinde, hedef sistemlerin erişilebilirlik protokollerine uyumlu, kararlı ve platform dostu bir veri aktarım süreci yürütülür.

* **Token ve Bütçe Optimizasyonu:** Dijital mecralardan toplanan binlerce metinsel değerlendirme ve uzun video transkriptleri, ham halleriyle büyük dil modellerine (LLM) doğrudan beslenmez. Sistemimiz, hiyerarşik bir Map-Reduce mimarisi işleterek verileri yapılandırılmış kümelere böler; organik olmayan anormallik barındıran veya manipülatif kalıplar içeren segmentleri önceden filtreleyerek özetler. Bu yaklaşım, bağlam penceresi (context window) limitlerinin aşılmasını engellerken, token tüketimini ve operasyonel API maliyetlerini minimum seviyede tutarak projenin finansal sürdürülebilirliğini en üst noktaya taşır.

## 💸 API Maliyet Modeli

MergeN, prototip ve erken büyüme aşamasında **sıfır API maliyetiyle** 
çalışacak şekilde tasarlanmıştır. Tüm çekirdek servisler ücretsiz 
katmanlar içinde kalınarak kullanılmaktadır:

| Servis | Ücretsiz Limit | MergeN Kullanımı | Günlük Kapasite |
|---|---|---|---|
| Gemini 2.5 Flash | 1.500 istek/gün | ~6 istek/analiz | **~250 analiz/gün** |
| Tavily Search API | 1.000 arama/ay | ~3 arama/analiz | ~333 analiz/ay |
| YouTube Data API v3 | 10.000 ünite/gün | ~100 ünite/analiz | **~100 analiz/gün** |

> **Darboğaz:** YouTube API kotası, günlük ~100 analizde tavan 
> yapıyor. Büyüme aşamasında YouTube transkript önbellekleme 
> (caching) ve YouTube API yerine alternatif transkript çekme 
> yöntemleriyle bu limit 3-4 katına çıkarılabilir.
---

## 📂 Proje Yapısı
```text
MergeN/
├── backend/          # FastAPI ve LangGraph Agent Pipeline
├── frontend/         # React.js & Vite modern kullanıcı arayüzü
├── scrapper/         # Çoklu platform veri toplama motoru (Trendyol, HB, YouTube)
└── extention/         # Tarayıcı eklentisi
```

---

## 🚀 Kurulum ve Çalıştırma

**Ön Gereksinimler:** Python 3.10+, Node.js 18+

**1. Çevre Değişkenleri (.env):**
Proje ana dizininde, `backend/` ve `scrapper/` dizinlerinde bulunan `.env.example` dosyalarını `.env` olarak kopyalayın ve içerisine gerekli API anahtarlarını (Gemini, Tavily) ekleyin.

**2. Backend Kurulumu:**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8765
```

**3. Frontend Kurulumu:**
```bash
cd frontend
npm install
npm run dev
```

---


## 🔮 Geleceğe Yönelik Geliştirme Fikirleri
MergeN sadece bir hackathon projesi değil, büyük bir pazar ihtiyacını karşılayan ölçeklenebilir bir girişimdir:
- **B2C (Son Kullanıcı):** Ücretsiz temel tarama ve ileri düzey detaylı analizler için Freemium modeli. Ayrıca kullanıcıların yönlendirildiği alışveriş linkleri üzerinden **Affiliate (Satış Ortaklığı)** geliri.
- **B2B (Kurumsal Çözümler):** Markalar ve e-ticaret satıcıları için rakip analizi, pazar duyarlılığı (sentiment) ölçümü ve "manipülasyon haritası" hizmetleri sağlayan API/Dashboard çözümleri.
- **Mobil Uygulama (Barkod Okuma):** Fiziksel mağazada bir ürünü incelerken barkod okutarak saniyeler içinde MergeN röntgeni çekebilme.
- **Dinamik Fiyat ve "Yapay İndirim" Uyarıcısı:** Satıcının fiyatı önce artırıp sonra indirdiği senaryoların gerçek zamanlı bildirimi.

Demo Görüntüleri: 
---
Erlik Raporu:
---
<img width="517" height="399" alt="Ekran görüntüsü 2026-05-19 225220" src="https://github.com/user-attachments/assets/7d963e51-2cc9-4fa7-8b27-073f5fbcce6f" />

Yargucu Raporu:
---
<img width="661" height="430" alt="Ekran görüntüsü 2026-05-19 225106" src="https://github.com/user-attachments/assets/18f848bf-08b8-41e4-aae9-0bc642803a8b" />

Danışmanla Sohbet
---
<img width="398" height="381" alt="Ekran görüntüsü 2026-05-19 225127" src="https://github.com/user-attachments/assets/881f2f19-eb3b-4ae8-b1c9-b2e518791c87" />

Üreticin Vaat Ettiği-Gerçek Kullanıcı Deneyimleri
---
<img width="462" height="428" alt="Ekran görüntüsü 2026-05-19 225147" src="https://github.com/user-attachments/assets/21405726-c192-47e1-a1e2-6add135f3236" />

