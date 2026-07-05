# 🕵️‍♂️ MergeN: Multimodal Manipülasyon Analizi & Karar Motoru

MergeN (Alışveriş Röntgeni), dijital ticaret ekosistemindeki bilgi asimetrisini ortadan kaldırmak için tasarlanmış, ajan tabanlı (agentic) bir karar destek mekanizmasıdır. Sistem, sadece metin tabanlı yorumları değil; görsel, işitsel ve fiyat odaklı manipülasyon sinyallerini Gemini 2.5 Pro ve Vision modelleriyle analiz ederek kullanıcıya "gerçek" satın alma değerini sunar.

---

## 1. Mimari Katmanlar ve Teknik Derinlik

Sistem, birbirini besleyen üç ana katman üzerinde yükselmektedir:

### A. Veri Toplama ve Orşestrasyon (Research Layer)
Bu katman, manipülasyonun izini sürmek için internetin farklı köşelerinden ham veri toplar:
* **E-Ticaret Kazıma (Tavily):** Trendyol ve Hepsiburada üzerindeki ürün yorumlarını, satıcı puanlarını ve kampanya geçmişlerini toplar.
* **Topluluk Hafızası (Forumlar):** Technopat, Donanım Haber, Reddit, Techolay ve PCHocası gibi platformlardan ürünle ilgili "kronik sorun" ve "fiyat/performans" tartışmalarını çeker.
* **Multimodal Girdi (YouTube):** Ürün inceleme videolarının transkriptlerini ve görsel karelerini analiz edilmek üzere işleme sokar.

### B. Bilişsel Analiz Katmanı (X-Ray & Analysis Layer)
Toplanan veriler, LangGraph üzerinde koşan uzman ajanlar tarafından işlenir:
* **Semantik Sahtecilik Tespiti:** Yorumlardaki dil kalıpları, birbirine benzeyen ifadeler ve anormal zaman dilimlerinde yoğunlaşan 5 yıldızlı yorumları (cluster analysis) ayıklar.
* **Görsel Doğrulama (Computer Vision):** Üreticinin sunduğu parlak stüdyo görselleri ile forumlarda veya YouTube videolarında görülen "gerçek" ürün kalitesini (malzeme dokusu, renk sapması, montaj kalitesi) karşılaştırır.
* **Fiyat Manipülasyon Analizi:** Akakçe ve Cimri gibi kaynaklardan gelen verilerle, "Büyük İndirim" etiketlerinin gerçekliğini denetler.

### C. Karar ve Denetleme Katmanı (Advisor & Challenger)
Projenin en özgün kısmı, AI'nın kendi kararlarını denetlediği bu bölümdür:
* **Kişiselleştirilmiş Karar Raporu:** Kullanıcının önceliklerine (örneğin "pil ömrü benim için her şeydir") göre bir uyum skoru ve net bir "AL/ALMA" tavsiyesi üretir.
* **Şeytanın Avukatı (Challenger Agent):** Verilen karara karşı-argüman geliştirir. Örneğin; ürün için "AL" kararı verilmişse, Challenger ajanı forumlardaki nadir ama kritik şikayetleri öne çıkararak "Şu şartlar altında almayabilirsin" uyarısı ekler.

---

## 2. Manipülasyon DNA: 4 Katmanlı Güven Skorlaması

Sistem, her ürün için 0-100 arası bir **Ağırlıklı Güven Skoru** hesaplar:

| Katman | Etki Ağırlığı | Analiz Edilen Sinyaller |
| :--- | :---: | :--- |
| **Yorum Güvenilirliği** | %35 | Bot tespiti, satın alma kanıtı, generic/aşırı övücü dil kullanımı. |
| **Topluluk Onayı (Forum)** | %30 | Kronik arıza başlıkları, teknik destek talepleri, kullanıcı deneyimi tutarlılığı. |
| **Multimodal Kanıt (Video)** | %20 | Reviewer'ın sözlü beyanı ile görseldeki değerlerin (benchmark skorları, şarj süreleri) tutarlılığı. |
| **Fiyat & İddia Doğruluğu** | %15 | "Şişirilmiş fiyat-indirim" döngüsü ve üretici spesifikasyonlarının doğruluğu. |

---

## 3. Kullanıcı Deneyimi ve Ara Yüzler

### 🌐 Browser Extension: "Anlık Röntgen"
Kullanıcı bir ürün sayfasındayken (Trendyol/HB), ekranın köşesinde bir "Röntgen" butonu belirir. Tıklandığında yan panelde şu bilgiler akar:
* **Hızlı Badge:** AL / KOŞULLU / ALMA.
* **Manipülasyon Özeti:** Hangi katmanda sorun olduğu (Yorum ⚠️, Fiyat ✓) ikonlarla gösterilir.
* **Kritik Bulgu:** "Bu ürün son 3 ayın en yüksek fiyatında" veya "Yorumların %40'ı şüpheli".

### 📊 Web App: "Derin Analiz Dashboard"
Daha detaylı bilgi isteyen kullanıcılar için oluşturulan tam dashboard:
* **Radar Chart:** Manipülasyon DNA'sının görselleşmiş hali.
* **Video Insights Bölümü:** YouTube videolarından yakalanan çelişki anlarının saniye saniye dökümü.
* **Karşı-Argüman Paneli:** AI'nın kendi kararıyla girdiği teknik tartışma ve "Kimler Almamalı?" listesi.
* **İnteraktif Chat:** "Bu kulaklığın mikrofonu Discord için yeterli mi?" gibi spesifik soruların tüm veri havuzuna dayalı yanıtlandığı panel.

---

## 4. Teknolojik Ekosistem (Stack)

* **Zeka Motoru:** Google Gemini 2.5 Pro (Multimodal yetenekler ve akıl yürütme için).
* **Hız Katmanı:** Gemini Flash (Düşük maliyetli hızlı analizler ve chat için).
* **Ajan Yapısı:** LangGraph (Döngüsel ajan akışları ve durum yönetimi).
* **Veri Ağı:** Tavily AI (Custom Domain Filtering: Technopat, Reddit, Şikayetvar entegrasyonu).
* **Modern Web:** React, Vite, Tailwind CSS (Smooth UI geçişleri).
* **Extension Mimari:** Manifest V3, Side Panel API.

---

## 5. Gelecek Vizyonu ve Genişleme

MergeN platformunun temelleri, ileride şu yeteneklere evrilecek şekilde tasarlanmıştır:
* **Aciliyet Manipülasyonu Tespiti:** "Son 2 ürün!" veya "X kişi şu an inceliyor" gibi psikolojik baskı tekniklerinin gerçek zamanlı analizi.
* **Reviewer Trust Score:** İnceleme yapan kanalların geçmişteki tutarlılıklarına göre "güvenilirlik puanı" alması.
* **Alternatif Rota:** Şüpheli bulunan ürün yerine, forum onaylı ve fiyatı manipüle edilmemiş 3 temiz alternatif önerisi.