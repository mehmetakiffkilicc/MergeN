import airpodsStudio from '../assets/airpods_pro_2_studio.png';
import airpodsReal from '../assets/airpods_pro_2_real.png';
import asusStudio from '../assets/asus_tuf_a15_studio.png';
import asusReal from '../assets/asus_tuf_a15_real.png';

/* mockData.js — Apple AirPods Pro 2 mock + agent state */

export const CROSS_SOURCE_CONFLICTS = [
  {
    id: 'battery-claim',
    topic: 'Pil Ömrü',
    severity: 'high',
    summary: 'Üretici iddiası ve bağımsız ölçümler 8 saat sapıyor. Forum kullanıcıları ölçüme yakın.',
    statements: [
      { source: 'Üretici (Apple)', sourceType: 'manufacturer', value: '30 sa', stance: 'claim', detail: '"Pil ömrü 30 saate kadar (kutuyla)"', credibility: 'low' },
      { source: 'E-ticaret yorumları', sourceType: 'ecommerce', value: '~26 sa', stance: 'neutral', detail: 'Yorumlarda ortalama "iddia edilene yakın" — ama %18 kümeli koordinasyon sinyali var.', credibility: 'low' },
      { source: 'YouTube ölçümü', sourceType: 'youtube', value: '22 sa 18 dk', stance: 'measured', detail: "Reviewer sözel \"30 saat\" dedi; ekrandaki iPhone widget'ında 22sa görünüyor.", credibility: 'high' },
      { source: 'Forum konsensüsü', sourceType: 'forum', value: '21-23 sa', stance: 'experience', detail: 'Technopat thread: "ben 21sa ölçtüm", DonanımHaber: "22sa". Tutarlı.', credibility: 'high' },
    ],
    resolution: 'Bağımsız iki kaynak (YouTube + forum) iddianın 8 saat şişirilmiş olduğunu doğruluyor. **Gerçek: ~22 sa**. E-ticaret yorumları kümeli koordinasyon sinyali nedeniyle düşük ağırlıkta.',
  },
  {
    id: 'anc-claim',
    topic: 'ANC Performansı',
    severity: 'low',
    summary: 'Tüm kaynaklar büyük ölçüde örtüşüyor. Yalnızca üretici iddiası 4 dB daha agresif.',
    statements: [
      { source: 'Üretici (Apple)', sourceType: 'manufacturer', value: '−38 dB', stance: 'claim', detail: '"2× daha fazla aktif gürültü engelleme"', credibility: 'low' },
      { source: 'YouTube ölçümü', sourceType: 'youtube', value: '−34 dB', stance: 'measured', detail: 'Donanım Avcısı kanalı, kontrollü ortam ölçümü.', credibility: 'high' },
      { source: 'Forum konsensüsü', sourceType: 'forum', value: '"Sınıfında üst"', stance: 'experience', detail: 'Metro, uçak, kafe ortamlarında pozitif.', credibility: 'high' },
      { source: 'E-ticaret yorumları', sourceType: 'ecommerce', value: '+538 / −22', stance: 'sentiment', detail: '%96 lehte. Çapraz kaynak doğrulandı.', credibility: 'medium' },
    ],
    resolution: 'Tüm kaynaklar **uyumlu**. Üretici iddiası 4 dB optimistik ama bant içi. Kararı destekler.',
  },
  {
    id: 'fit-comfort',
    topic: 'Rahatlık (4+ saat)',
    severity: 'medium',
    summary: 'E-ticaret memnun, forum daha sert. Uzun süreli kullanım hâlâ tartışmalı.',
    statements: [
      { source: 'Üretici (Apple)', sourceType: 'manufacturer', value: '"Tüm gün rahat"', stance: 'claim', detail: 'Marketing ifadesi.', credibility: 'low' },
      { source: 'E-ticaret yorumları', sourceType: 'ecommerce', value: '+318 / −64', stance: 'sentiment', detail: '%83 lehte, ama 4+ saat tek kullanımdan bahseden az.', credibility: 'medium' },
      { source: 'Forum konsensüsü', sourceType: 'forum', value: 'Karışık', stance: 'experience', detail: 'Technopat: "4 saatten sonra basınç hissi" — 12 onaylayan post.', credibility: 'high' },
      { source: 'YouTube ölçümü', sourceType: 'youtube', value: 'Bahsedilmemiş', stance: 'missing', detail: 'Hiçbir reviewer uzun süreli kullanımı test etmedi.', credibility: 'medium' },
    ],
    resolution: 'Forum kullanıcıları **kısa kullanım için iyi, uzun için tartışmalı** diyor. E-ticaret kısa-kullanım sentimentı baskın. Kararı: kısa-orta süre kullanıcı için sorun yok.',
  },
];

export const CATEGORY_SCORES = [
  { key: 'sound', name: 'Ses Kalitesi', score: 87, sentiment: { pos: 412, neg: 38 }, top: 'Bas tepkisi belirgin, vokal netliği yüksek.', verdict: 'good' },
  { key: 'anc', name: 'Aktif Gürültü Engelleme', score: 92, sentiment: { pos: 538, neg: 22 }, top: 'Metro ve uçakta sınıfının en iyilerinden.', verdict: 'good' },
  { key: 'comfort', name: 'Rahatlık', score: 81, sentiment: { pos: 318, neg: 64 }, top: '4+ saatte hafif basınç hissi raporları var.', verdict: 'good' },
  { key: 'battery', name: 'Pil Ömrü', score: 58, sentiment: { pos: 187, neg: 142 }, top: 'İddia 30sa, ölçüm 22sa. Çelişki forumlarda doğrulanıyor.', verdict: 'bad' },
  { key: 'mic', name: 'Mikrofon', score: 76, sentiment: { pos: 241, neg: 89 }, top: 'Sessiz ortamda iyi; rüzgâr/dış mekânda zayıflıyor.', verdict: 'warn' },
  { key: 'connect', name: 'Bağlantı', score: 89, sentiment: { pos: 423, neg: 31 }, top: 'iPhone/Mac geçişi pürüzsüz; multipoint sınırlı.', verdict: 'good' },
];

export const MOCK_PRODUCT = {
  isMockProduct: true,
  id: 'apple-airpods-pro-2',
  name: 'Apple AirPods Pro (2. Nesil)',
  category: 'Kablosuz Kulaklık',
  category_scores: CATEGORY_SCORES,
  crossSourceConflicts: CROSS_SOURCE_CONFLICTS,
  image: 'AIRPODS PRO',
  price: { current: 7849, was: 9999, discount: 22 },
  realDiscount: {
    label: 'GERÇEK İNDİRİM: %6',
    detail: 'Son 30 günde en düşük 7400 ₺ → 7849 ₺. Etiketteki %22 yapay.',
  },
  priceHistory: [9999, 9800, 9499, 9499, 8999, 8499, 7999, 7400, 7600, 7849],
  claims: [
    {
      claim: "Aktif Gürültü Engelleme (ANC) bir önceki nesle göre 2 kata kadar daha fazla arka plan gürültüsünü engeller.",
      reality: "Bağımsız testler ve kullanıcı analizlerine göre alt frekanslarda (motor, yol gürültüsü) gerçekten ~1.8x bir engelleme görülürken, insan sesi gibi orta frekanslarda fark %30 civarında.",
      score: 0.72,
      contrary_percentage: 28
    },
    {
      claim: "Tek şarjla 6 saate kadar dinleme süresi ve şarj kutusuyla toplam 30 saat kullanım.",
      reality: "Yüksek ses seviyesinde ve ANC ortamlarında tek şarj ortalama 5.5 saate iniyor. Toplam kullanım ise ölçümlerde ~22-24 saat aralığında.",
      score: 0.27,
      contrary_percentage: 73
    },
    {
      claim: "H2 çip sayesinde kusursuz bağlantı ve cihazlar arası anında geçiş.",
      reality: "Apple ekosistemi içinde (iPhone ↔ Mac) kusursuz çalışıyor, ancak kalabalık Bluetooth ortamlarında veya eski cihazlarda anlık takılmalar (%8) rapor edilmiş.",
      score: 0.92,
      contrary_percentage: 8
    }
  ],
  sources: {
    trendyolReviews: 847,
    hepsiburadaReviews: 412,
    forumThreads: 6,
    youtubeVideos: 4,
    forumPosts: 142,
    donanimhaber: 78,
    technopat: 41,
    eksisozluk: 23,
    webtekno: 4,
    sikayetvar: 1,
    scraperAvailable: true,
    totalReviews: 1259,
  },
  trustScore: 68,
  trustBreakdown: [
    { lbl: 'Forum', pct: 35, score: 76 },
    { lbl: 'YouTube', pct: 30, score: 64 },
    { lbl: 'E-ticaret', pct: 20, score: 58 },
    { lbl: 'İddia', pct: 15, score: 71 },
  ],
  dna: [
    { axis: 'Yorum', value: 42, label: 'Orta Şüphe', tier: 'warn', detail: '%18 yorum kümeli zaman aralığında, çoğu jenerik dilde. Resmi 4.7 → temizlenmiş 4.3.' },
    { axis: 'Fiyat', value: 18, label: 'Temiz', tier: 'good', detail: '22% indirim etiketi yapay; gerçek son-30-gün indirimi %6. Yine de bant içi.' },
    { axis: 'Görsel', value: 28, label: 'Düşük', tier: 'good', detail: 'Stüdyo görseli ile kullanıcı fotoğrafları arasında ciddi fark yok. Renk: ✓' },
    { axis: 'İddia', value: 56, label: 'Yüksek Şüphe', tier: 'bad', detail: '"30 saat pil" iddiası YouTube ölçümünde 22 saat. ANC iddiası: 3/4 reviewer doğruluyor.' },
  ],
  videos: [
    {
      channel: 'F**** K****',
      title: 'AirPods Pro 2 İncelemesi — Batarya Performansı Testi (10:45)',
      thumb: 'https://img.youtube.com/vi/uV_0l7AZpIs/hqdefault.jpg',
      id: 'uV_0l7AZpIs',
      videoId: 'uV_0l7AZpIs',
      time: '12:27',
      moment: '10:45',
      startSec: 645,
      startAt: 645,
      conflict: { claimedLabel: 'Apple İddiası', claimed: '30 saat (kutu dahil)', actualLabel: 'Reviewer Testi', actual: '~22 saat ölçüldü', bad: true },
      summary: 'Furkan Karaca batarya testinde Apple\'ın "30 saat" iddiasının gerçek kullanımda 22 saat civarına düştüğünü gösteriyor. 10:45\'te bizzat ölçüm yapıyor.',
    },
    {
      channel: 'D**** A****',
      title: 'AirPods Pro 2 Type-C — ANC Gürültü Denetim Testi (10:22)',
      thumb: 'https://img.youtube.com/vi/GSwJK05PzEk/hqdefault.jpg',
      id: 'GSwJK05PzEk',
      videoId: 'GSwJK05PzEk',
      time: '15:50',
      moment: '10:22',
      startSec: 622,
      startAt: 622,
      conflict: { claimedLabel: 'Apple İddiası', claimed: 'Önceki nesle göre 2x ANC', actualLabel: 'Gerçek Test', actual: 'Tutarlı; alt frekanslarda güçlü', bad: false },
      summary: '10:22\'de Gürültü Denetim Modları bölümünde ANC performansı test ediliyor. Alt frekanslarda güçlü, insan sesi frekanslarında daha sınırlı — genel olarak iddia ile örtüşüyor.',
    },
  ],
  decision: {
    badge: 'KOŞULLU AL',
    tier: 'warn',
    summary: 'Apple AirPods Pro 2 senin için **koşullu** önerilir. Ses kalitesi, ANC ve cihaz ekosistemi avantajları net; ancak fiyat etiketi yapay, pil iddiası 8 saat şişirilmiş ve yorum havuzunda kümeli koordinasyon sinyalleri var.',
    detail: 'Senin "iPhone kullanıyorum, ANC önemli, fiyat ikincil" profilinde uyum skoru **82/100**. Eğer pil ömrü ilk 3 öncelikten biriyse, beklenti yönetimi gerekir: gerçek pil ~22 saat (10 saat değil 6.5 saat single-charge).',
    pros: [
      'Ses & ANC: 4 bağımsız ölçümde de iddia ≈ gerçek',
      'Apple ekosistem entegrasyonu (sınıfında rakipsiz)',
      'Stüdyo görseli ↔ gerçek ürün: uyum çok yüksek',
    ],
    cons: [
      'Pil iddiası 8 saat şişirilmiş (30sa → 22sa)',
      '%22 "indirim" yapay — son 30 gün dipi ile fark %6',
      'Hepsiburada yorumları kümeli; 18-22 Mart kümesi açıklanamaz',
    ],
  },
  challenger: {
    title: 'Erlik — Bu kararı sorgula',
    points: [
      'Eğer pil ömrü 1. önceliğinse: Sony WF-1000XM5 gerçek ölçümde 24 saat veriyor; AirPods 22 saat. Marjinal ama yönlü fark.',
      'Eğer iPhone kullanmıyorsan: ekosistem avantajı düşer, koşullu öneri "ALMA" yönüne kayar.',
      'Eğer "yapay indirim" sana psikolojik olarak rahatsız geliyorsa: 2 hafta bekle. Son 90 günde 3 kez 7400 ₺ gördü.',
    ],
  },
  imageVerification: {
    matchScore: 96,
    matchTier: 'good',
    matchLabel: 'YÜKSEK UYUM',
    studio: { lbl: 'STÜDYO · APPLE', sub: 'apple.com/airpods-pro-2 · 2400×2400 · RGB', img: airpodsStudio },
    real: { lbl: 'GERÇEK · YOUTUBE', sub: '@mertbayantemur · 04:23 keyframe · 1080p', img: airpodsReal },
    hotspots: [
      { id: 1, studio: { x: 38, y: 40 }, real: { x: 30, y: 25 }, label: 'Şarj Kutusu — LED & Üst Yüzey' },
      { id: 2, studio: { x: 72, y: 68 }, real: { x: 55, y: 62 }, label: 'Konnektör & Kulaklık Sap Ucu' },
      { id: 3, studio: null, real: { x: 82, y: 80 }, label: '+1 Ekstra XS Silikon Adapter' },
    ],
    findings: [
      { tier: 'good', pct: 98, label: 'Dış Geometri & Tasarım', note: 'Kulaklık ve kutu kıvrımları, oval kenarlar ve genel tasarım formu stüdyo render\'ı ile tamamen örtüşüyor.' },
      { tier: 'good', pct: 97, label: 'Şarj LED Konumu', note: 'Ön yüzdeki durum LED\'inin konumu, yeşil ışık yansıması ve yerleşimi stüdyo şeması ile tamamen tutarlı.' },
      { tier: 'good', pct: 96, label: 'Konnektör Tasarımı', note: 'Lightning yerine yeni USB-C portunun fiziksel yerleşimi ve yuva derinliği birebir doğrulanmış durumda.' },
      { tier: 'good', pct: 95, label: 'Hoparlör & Askı Yuvası', note: 'Kutunun altındaki hoparlör delikleri ve yan taraftaki metal askı yuvası fiziksel üründe de stüdyo kalitesinde mevcut.' },
      { tier: 'good', pct: 94, label: 'Fiziksel Kutu İçeriği', note: 'Masanın üzerindeki yedek silikon kulaklık uçlarının (XS dâhil) varlığı dürüst ve tam paket içeriğini doğruluyor.' },
    ],
    verdict: 'Stüdyo görseli fiziksel gerçeği **birebir dürüstlükle yansıtıyor**. Yapay zeka karşılaştırmamızda, AirPods Pro 2\'nin tüm ayırt edici dış tasarım bileşenleri (USB-C girişi, hoparlör ızgaraları, LED yerleşimi ve kutu içeriği) **kusursuz bir şekilde eşleşmiştir**.',
  },
  chatHistory: [
    { from: 'user', text: 'Pil iddiası ile gerçek arasındaki fark beni rahatsız etti. Apple\'a güvenmeli miyim?' },
    {
      from: 'bot',
      agent: 'Challenger',
      text: 'Apple **kasıtlı yalan söylemiyor** — pazarlama dili "with case" (kutu dahil) ifadesini görece küçük basıyor. **Single-charge ölçümde**: iddia 6 saat, ölçüm 5sa 50dk. Bu sınırda kabul edilebilir. Asıl sapma kutu+kulaklık toplamında: 30 sa iddia, 22 sa 18 dk ölçüm. Bunu **"abartılı ama tamamen sahte değil"** kategorisinde değerlendiriyorum. Senin profilinde tolere edilebilir.',
    },
    { from: 'user', text: 'Sony WF-1000XM5 ile karşılaştırır mısın?' },
    {
      from: 'bot',
      agent: 'Advisor',
      text: '**Hızlı kıyaslama** (her ikisi de röntgenden geçirilmiş): \n\n• **Ses**: AirPods Pro 2 (4.4/5) ≈ Sony (4.5/5). Berabere.\n• **ANC**: Sony +2 dB daha sessiz (gerçek ölçüm).\n• **Pil**: Sony 24sa gerçek; AirPods 22sa gerçek.\n• **Ekosistem**: iPhone\'da AirPods kazanır; Android\'de Sony.\n• **Fiyat**: Sony 9899 ₺ (temiz indirim %12), AirPods 7849 ₺ (yapay %22).\n\n**Karar**: iPhone\'daysan AirPods kalır; değilse Sony bir tık önde.',
    },
  ],
  suggestions: [
    'En büyük zayıflığı nedir?',
    'Sony WF-1000XM5 ile kıyasla',
    'Forum kullanıcıları en çok neye kızıyor?',
    '6 ay sonra hâlâ değer mi?',
  ],
};

export const PHASES = [
  {
    id: 'research', name: 'Tulpar', duration: 2200, messages: [
      'Tavily kazıma başlatıldı: trendyol.com',
      '243 yorum snippet\'i toplandı',
      '847 yorum (Trendyol) + 412 yorum (Hepsiburada)',
      'Forum: donanimhaber.com, technopat.net taranıyor',
      '6 forum thread, 142 post bağlandı',
      'YouTube: 4 inceleme videosu, 38 dk toplam içerik',
    ]
  },
  {
    id: 'xray', name: 'Kam', duration: 3000, messages: [
      'Yorum kümesi analizi başlatıldı (Gemini Pro)',
      '18-22 Mart kümesi tespit edildi: %18 koordineli yorum',
      'Fiyat geçmişi sorgulanıyor (Akakçe, Cimri)',
      '22% indirim etiketi → gerçek %6 (son 30 gün)',
      'Görsel doğrulama: stüdyo ↔ kullanıcı fotoğrafları',
      'Multimodal video kesitleri (4 kesit × 30sn)',
      'PİL İDDİASI ÇELİŞKİSİ: 30sa → ekranda 22sa',
    ]
  },
  {
    id: 'analysis', name: 'Bilge', duration: 1600, messages: [
      'Kategori skorlama: ses, ANC, pil, mikrofon, rahatlık',
      'Top 3 güçlü yön + top 3 zayıf yön',
      'Forum vs E-ticaret çapraz tutarlılık',
    ]
  },
  {
    id: 'advisor', name: 'Yargucu', duration: 1300, messages: [
      'Profil eşleştirme: "iPhone + ANC öncelikli"',
      'Kişisel uyum skoru hesaplanıyor → 82/100',
      'Alternatif arama: Sony WF-1000XM5, Bose QC Ultra',
      'Karar: KOŞULLU AL',
    ]
  },
  {
    id: 'challenger', name: 'Erlik', duration: 1100, messages: [
      'Şeytanın avukatı modu aktif',
      'Karara karşı 3 senaryo üretiliyor',
      'Final dengelenmiş tavsiye',
    ]
  },
];

export const PRIORITY_LABELS = {
  anc: { name: 'ANC / Gürültü Engelleme', delta: +5, note: 'AirPods\'un en güçlü yönü; iddia ↔ gerçek uyumlu.' },
  sound: { name: 'Ses Kalitesi', delta: +3, note: 'Sınıfında üst seviye, sürpriz yok.' },
  battery: { name: 'Pil Ömrü', delta: -15, note: 'İddia 30sa → gerçek 22sa. Bu önceliğinse risk.' },
  mic: { name: 'Mikrofon Kalitesi', delta: 0, note: 'İddia ↔ gerçek tutarlı; ortalama.' },
  price: { name: 'Fiyat / Değer', delta: -10, note: 'Etiket %22 indirim yapay; gerçek %6.' },
};

export const DEVICE_LABELS = {
  iphone: { name: 'iPhone', delta: +10, note: 'Apple ekosistem entegrasyonu sınıfında rakipsiz.' },
  android: { name: 'Android', delta: -25, note: 'Ekosistem avantajı kaybolur; alternatifler öne çıkar.' },
  both: { name: 'İkisi', delta: -5, note: 'Karışık kullanım — avantajların yarısı düşer.' },
};

export const BUDGET_LABELS = {
  tight: { name: 'Sıkı bütçe', delta: -5, note: 'Yapay %22 indirim bu profilde rahatsız edici.' },
  flexible: { name: 'Esnek', delta: +3, note: 'Fiyat odağı düşer; kalite öne çıkar.' },
  irrelevant: { name: 'Önemsiz', delta: +5, note: 'Sadece kalite/uyum sayar.' },
};

export function deriveDecision(profile, productName = '') {
  const isSony = productName.toLowerCase().includes('sony');
  const isApple = productName.toLowerCase().includes('apple') || productName.toLowerCase().includes('airpods');
  const name = isSony ? 'Sony' : (isApple ? 'Apple' : 'Üretici');

  const deviceLabels = {
    iphone: { name: 'iPhone', delta: isApple ? 10 : (isSony ? -5 : 0), note: isApple ? 'Apple ekosistem entegrasyonu sınıfında rakipsiz.' : (isSony ? 'iOS üzerinde Sony uygulaması iyi çalışır ama ekosistem entegrasyonu standarttır.' : 'iOS entegrasyonu standarttır.') },
    android: { name: 'Android', delta: isSony ? 10 : (isApple ? -25 : 0), note: isSony ? 'Sony LDAC desteği ve Android entegrasyonu mükemmeldir.' : (isApple ? 'Ekosistem avantajı kaybolur; alternatifler öne çıkar.' : 'Android entegrasyonu standarttır.') },
    both: { name: 'İkisi', delta: -5, note: 'Karışık kullanım — avantajların yarısı düşer.' },
  };

  const priorityLabels = {
    anc: { name: 'ANC / Gürültü Engelleme', delta: isSony ? 8 : (isApple ? 5 : 3), note: isSony ? 'Sony ANC performansı sınıfının en iyilerindendir.' : (isApple ? 'AirPods\'un en güçlü yönü; iddia ↔ gerçek uyumlu.' : 'Fiyat/performans oranına göre yeterli ANC performansı.') },
    sound: { name: 'Ses Kalitesi', delta: isSony ? 10 : (isApple ? 3 : 5), note: isSony ? 'LDAC ve hi-res ses desteği ile müzik severler için mükemmel seçim.' : (isApple ? 'Sınıfında üst seviye, sürpriz yok.' : 'Kullanıcı yorumlarına göre dengeli bir ses profili.') },
    battery: { name: 'Pil Ömrü', delta: isSony ? 5 : (isApple ? -15 : -5), note: isSony ? 'Sony 24-30 saat arası gerçek kullanım süresiyle AirPods\'tan daha uzun pil ömrü sunar.' : (isApple ? 'İddia 30sa → gerçek 22sa. Bu önceliğinse risk.' : 'Gerçek ölçümler üretici iddiasının biraz gerisindedir.') },
    mic: { name: 'Mikrofon Kalitesi', delta: isApple ? 5 : 0, note: isApple ? 'Rüzgar ve arka plan gürültü engellemesi çok başarılıdır.' : 'Günlük telefon görüşmeleri için yeterli performans.' },
    price: { name: 'Fiyat / Değer', delta: isSony ? -5 : (isApple ? -10 : 0), note: isSony ? 'Sony premium fiyat segmentindedir ancak sunduğu kaliteyle dengelidir.' : (isApple ? 'Etiket %22 indirim yapay; gerçek %6.' : 'Fiyat segmentine göre uygun değer sunuyor.') },
  };

  const budgetLabels = {
    tight: { name: 'Sıkı bütçe', delta: -5, note: isSony ? 'Premium fiyat bütçenizi zorlayabilir.' : 'Yapay indirimler bu profilde rahatsız edici olabilir.' },
    flexible: { name: 'Esnek', delta: +3, note: 'Fiyat odağı düşer; kalite öne çıkar.' },
    irrelevant: { name: 'Önemsiz', delta: +5, note: 'Sadece kalite/uyum önceliklidir.' },
  };

  const base = 75;
  let score = base;
  const reasons = [];

  if (profile.device && deviceLabels[profile.device]) {
    const d = deviceLabels[profile.device];
    score += d.delta;
    reasons.push({ kind: 'device', text: `${d.name}: ${d.delta > 0 ? '+' : ''}${d.delta}`, note: d.note });
  }
  (profile.priorities || []).forEach((p) => {
    const pr = priorityLabels[p];
    if (!pr) return;
    score += pr.delta;
    reasons.push({ kind: 'priority', text: `${pr.name}: ${pr.delta > 0 ? '+' : ''}${pr.delta}`, note: pr.note });
  });
  if (profile.budget && budgetLabels[profile.budget]) {
    const b = budgetLabels[profile.budget];
    score += b.delta;
    reasons.push({ kind: 'budget', text: `${b.name}: ${b.delta > 0 ? '+' : ''}${b.delta}`, note: b.note });
  }

  score = Math.max(15, Math.min(98, score));

  let badge, tier, summary;
  if (score >= 75) {
    badge = 'AL'; tier = 'good';
    summary = `Profilinde **net AL**. Manipülasyon sinyalleri tolere edilebilir; ${name} ürününün güçlü olduğu eksenler senin önceliklerinle örtüşüyor.`;
  } else if (score >= 50) {
    badge = 'KOŞULLU AL'; tier = 'warn';
    summary = `Profilinde **koşullu**. ${name} ürününün avantajları var ama bazı sapmalar tam senin öncelik eksenine düşüyor — kararı verirken bu durumu bilerek ver.`;
  } else {
    badge = 'ALMA'; tier = 'bad';
    summary = `Profilinde **alma**. Manipülasyon sinyalleri tam senin öncelik eksenine düşüyor. Alternatiflere bakmanı şiddetle öneriyorum.`;
  }

  const challengerPoints = [];
  if (isSony) {
    if (profile.priorities?.includes('battery')) {
      challengerPoints.push('Sony pil ömrü konusunda son derece başarılıdır ve ek bir pil riski taşımaz.');
    }
    if (profile.device === 'iphone') {
      challengerPoints.push('iPhone kullanıyorsunuz: Sony LDAC (Hi-Res) desteği iOS\'ta çalışmaz, standart AAC kullanılır.');
    }
    if (profile.priorities?.includes('price')) {
      challengerPoints.push('Sony premium fiyatlandırmaya sahiptir; alternatif olarak Soundcore Space Q45 veya Sennheiser Accentum incelenebilir.');
    }
  } else if (isApple) {
    if (profile.priorities?.includes('battery')) {
      challengerPoints.push('Pil önceliğinde Sony WF-1000XM5 gerçek ölçümde 24sa — AirPods\'tan 2sa fazla. Bu önceliğin varsa Sony\'yi de röntgenden geçir.');
    }
    if (profile.device === 'android') {
      challengerPoints.push('Android\'desin: Apple ekosistemi avantajı yok. Sony veya Bose QC Ultra senin için ekosistem-nötr.');
    }
    if (profile.priorities?.includes('price')) {
      challengerPoints.push('Fiyat hassas profil: %22 etiketi son 90 günde 3 kez 7400 ₺ gördü. 2 hafta beklemek %6 daha düşürebilir.');
    }
  }

  if (challengerPoints.length === 0) {
    if (isSony) {
      challengerPoints.push(
        'Sony premium ses kalitesi sunar ama aktif spor için kulaküstü yapısı ağırdır.',
        'Müzik odaklı iseniz Sony harikadır ama mikrofon kalitesi AirPods kadar berrak değildir.'
      );
    } else if (isApple) {
      challengerPoints.push(
        'Apple ekosistemi dışındaysanız AirPods özellikleri kısıtlanır.',
        'AirPods Pro 2 gürültülü ortamlarda mükemmel mikrofon sunar.'
      );
    }
  }

  return {
    score,
    badge,
    tier,
    summary,
    reasons,
    challengerPoints,
    deviceLabel: deviceLabels[profile.device]?.name,
    priorityLabels: (profile.priorities || []).map(k => priorityLabels[k]?.name).filter(Boolean),
    budgetLabel: budgetLabels[profile.budget]?.name
  };
}

export const RIVAL_PRODUCT = {
  id: 'sony-wf-1000xm5',
  name: 'Sony WF-1000XM5',
  category: 'Kablosuz Kulaklık',
  image: 'WF-1000XM5',
  price: { current: 9899, was: 11299, discount: 12 },
  realDiscount: 10,
  trustScore: 79,
  decision: { badge: 'AL', tier: 'good', score: 84 },
  dna: [
    { axis: 'Yorum', value: 24, tier: 'good' },
    { axis: 'Fiyat', value: 12, tier: 'good' },
    { axis: 'Görsel', value: 22, tier: 'good' },
    { axis: 'İddia', value: 18, tier: 'good' },
  ],
  sources: {
    trendyolReviews: 612,
    hepsiburadaReviews: 387,
    forumPosts: 89,
    youtubeVideos: 5,
    donanimhaber: 45,
    technopat: 32,
    eksisozluk: 12,
    webtekno: 0,
    sikayetvar: 0,
    scraperAvailable: true,
  },
};

export const COMPARISON_CATEGORIES = [
  { key: 'sound', name: 'Ses Kalitesi', a: 87, b: 89, unit: '/100' },
  { key: 'anc', name: 'ANC (gerçek dB)', a: 92, b: 95, unit: '/100' },
  { key: 'battery', name: 'Pil (gerçek saat)', a: 73, b: 91, unit: '/100', noteA: '22sa', noteB: '24sa' },
  { key: 'mic', name: 'Mikrofon', a: 85, b: 80, unit: '/100' },
  { key: 'value', name: 'Fiyat / Değer', a: 71, b: 83, unit: '/100', noteA: '%6 gerçek', noteB: '%10 gerçek' },
  { key: 'iphone', name: 'iPhone Ekosistemi', a: 98, b: 65, unit: '/100' },
  { key: 'android', name: 'Android Uyumu', a: 62, b: 92, unit: '/100' },
];

export const COMPARISON_PROFILES = [
  { tag: 'iPhone + ANC öncelikli', winner: 'a', delta: '+8', note: 'Ekosistem avantajı ANC farkını geçer.' },
  { tag: 'Android + Pil öncelikli', winner: 'b', delta: '+22', note: 'Pil 2sa fazla + ekosistem-nötr + temiz fiyat.' },
  { tag: 'Bütçe önemli', winner: 'b', delta: '+5', note: 'AirPods etiketi yapay; Sony 2 bin ₺ pahalı ama gerçek indirim.' },
  { tag: 'Sadece ses + ANC', winner: 'b', delta: '+5', note: 'Sony 3 dB daha sessiz; ses farkı kulakla algılanmaz seviyede.' },
  { tag: 'iPhone + bütçe sıkı', winner: 'a', delta: '+3', note: 'Yine de AirPods — ama 2 hafta bekle, son 90 günde 7400 ₺ gördü.' },
];

export const STRENGTHS = [
  { title: 'Aktif gürültü engelleme', count: 538, source: 'Yorum + 3 YouTube ölçümü', detail: 'Bağımsız ölçümlerde -34 dB; iddia -38 dB. Sınıfında üst seviye.' },
  { title: 'Apple ekosistem entegrasyonu', count: 412, source: 'Forum + e-ticaret', detail: 'iPhone/Mac/iPad arası geçiş, "Hey Siri", FindMy entegrasyonu.' },
  { title: 'Ses kalitesi & vokal netliği', count: 412, source: 'YouTube + e-ticaret', detail: 'Dinamik aralık iyi; özellikle podcast/diyalog dinleyenler memnun.' },
];

export const WEAKNESSES = [
  { title: 'Şişirilmiş pil iddiası', count: 142, source: 'YouTube ölçüm + forum', detail: '"30 saat" iddiası gerçek ölçümde 22sa 18dk. Single-charge: iddia 6sa, ölçüm 5sa 50dk.', critical: true },
  { title: 'Multipoint sınırlamaları', count: 87, source: 'Forum (technopat, donanımhaber)', detail: 'Sadece iCloud cihazlarıyla otomatik; Android + iPhone arasında manuel.' },
  { title: 'Rüzgârlı ortamda mikrofon', count: 89, source: 'YouTube + 3 forum thread', detail: 'Dış mekânda arama yapan kullanıcılar "rüzgâr kesiyor" şikayeti getiriyor.' },
];

export const AGENT_DESCRIPTIONS = {
  research: 'Yorumlar, forumlar ve videolar toplanıyor',
  xray: 'Fiyat oyunları ve sahte iddialar aranıyor',
  analysis: 'Güçlü ve zayıf yönler değerlendiriliyor',
  advisor: 'Sana özel uyum skoru ve karar üretiliyor',
  challenger: 'Karar sorgulanıyor, karşı senaryolar üretiliyor',
};

export const DEFAULT_PROFILE = {
  device: 'iphone',
  priorities: ['anc', 'sound'],
  budget: 'flexible',
};



export const REVIEWERS = [
  {
    channel: 'Youtube Kanalı1',
    handle: '@youtubekanali1',
    subscribers: '2.1M',
    trustScore: 78,
    tier: 'good',
    label: 'GÜVENİLİR',
    consistency: 86,
    sponsorshipRatio: 0.18,
    sponsorshipLabel: '%18',
    accuracyDelta: '+0.08',
    accuracyNote: 'Geçmiş ölçümleri bağımsız doğrulamayla uyumlu (12 video / 14 doğrulama).',
    signals: [
      { kind: 'good', text: '"Sponsorlu" etiketi her zaman açıkta — Apple sponsorlu içerikten ayrı bir oturuma alınmış.' },
      { kind: 'good', text: '3 ay sonra dürüst yorum içeriği var; "ilk izlenim" tuzağına düşmemiş.' },
      { kind: 'warn', text: "AirPods incelemesinde sözel \"30 saat\" dedi — ekrandaki 22sa pil widget'ıyla çelişti." },
    ],
    contribution: 'Bu kanalın AirPods analizine **ağırlığı %38**. Çelişen pil iddiası nedeniyle 12 puan kırıldı.',
  },
  {
    channel: 'Youtube Kanalı2',
    handle: '@youtubekanali2',
    subscribers: '450B',
    trustScore: 91,
    tier: 'good',
    label: 'YÜKSEK GÜVEN',
    consistency: 94,
    sponsorshipRatio: 0.06,
    sponsorshipLabel: '%6',
    accuracyDelta: '+0.14',
    accuracyNote: 'Kontrollü ortam ölçümleri sektör standardıyla %94 uyumlu. ANC, ses, mikrofon için referans kanal.',
    signals: [
      { kind: 'good', text: 'Kontrollü oda + sektör-standardı ekipman. Her video metodoloji açıklamasıyla başlar.' },
      { kind: 'good', text: 'Sponsorlu içerik %6 — sektör ortalamasının çok altında.' },
      { kind: 'good', text: 'AirPods incelemesinde -34 dB ölçümü; bağımsız 2 kaynakla uyumlu.' },
    ],
    contribution: 'Bu kanalın ANC ve ses ölçümleri **referans alındı**. Ağırlığı %42.',
  },
  {
    channel: 'Teknoloji Forumu',
    handle: '@teknoloji.forumu',
    subscribers: '3.6M',
    trustScore: 41,
    tier: 'bad',
    label: 'DÜŞÜK GÜVEN',
    consistency: 38,
    sponsorshipRatio: 0.62,
    sponsorshipLabel: '%62',
    accuracyDelta: '−0.21',
    accuracyNote: "Geçmiş 7 ölçümün 5'i bağımsız doğrulamada %20+ saptı. \"Hype\" tabanlı içerik kalıbı.",
    signals: [
      { kind: 'bad', text: 'Sponsorlu içerik %62. Apple, Sony, JBL aynı dönemde "en iyi kulaklık" diye ayrı videolarda anılmış.' },
      { kind: 'bad', text: "Spec'leri tekrar ediyor, detaylı ölçüm yapmıyor. Kontrollü test verisi yok." },
      { kind: 'warn', text: 'Yorum bölümünde kronik batarya şikayetlerine yer vermemiş veya filtrelemiş.' },
    ],
    contribution: 'Bu kanalın analize **katkısı %0** — yüzeysel inceleme ve düşük bağımsızlık skoru nedeniyle dışlandı.',
  },
];

export const ALTERNATIVES = [
  {
    id: 'sony-wf-1000xm5',
    name: 'Sony WF-1000XM5',
    image: 'WF-1000XM5',
    category: 'Kablosuz Kulaklık',
    price: 9899,
    priceTag: '%12 → %10 gerçek',
    priceTagTier: 'good',
    trustScore: 79,
    decision: 'AL',
    decisionTier: 'good',
    matchScore: 84,
    matchReason: 'Pil ömrü + temiz fiyat etiketi + ekosistem-nötr — "Android öncelikli" profile uygun.',
    strengthDelta: '+24sa pil',
    weaknessDelta: '−iPhone entegrasyonu',
    cached: true,
  },
  {
    id: 'bose-qc-ultra',
    name: 'Bose QuietComfort Ultra',
    image: 'QC ULTRA',
    category: 'Kablosuz Kulaklık',
    price: 11499,
    priceTag: '%8 gerçek indirim',
    priceTagTier: 'good',
    trustScore: 82,
    decision: 'KOŞULLU AL',
    decisionTier: 'warn',
    matchScore: 71,
    matchReason: 'ANC sınıfı: −37 dB (sektör lideri). Fiyat 3.5K ₺ pahalı; mikrofon ortalama.',
    strengthDelta: '+ANC −3 dB',
    weaknessDelta: '−mikrofon kalitesi',
    cached: false,
  },
  {
    id: 'jbl-tune-720bt',
    name: 'JBL Tune 720BT',
    image: 'TUNE 720',
    category: 'Bluetooth Kulaklık',
    price: 1799,
    priceTag: '%18 gerçek indirim',
    priceTagTier: 'good',
    trustScore: 71,
    decision: 'KOŞULLU AL',
    decisionTier: 'warn',
    matchScore: 58,
    matchReason: '4x daha ucuz, kabul edilebilir ses. ANC yok; pil 76sa. Bütçe öncelikli profile uygun.',
    strengthDelta: '−6K ₺ fiyat',
    weaknessDelta: '−ANC yok',
    cached: false,
  },
];

export const XRAY_REVEAL = {
  before: {
    label: 'YÜZEY · ÜRETİCİ GÖZÜ',
    sub: 'E-ticaret + üretici iddiası',
    rating: 4.7,
    reviewCount: 1259,
    discount: 22,
    discountLabel: '%22',
    discountDetail: 'Etiket: 9999 ₺ → 7849 ₺',
    battery: '30 sa',
    batteryDetail: 'Apple iddiası (kutuyla)',
    anc: '−38 dB',
    ancDetail: 'Üretici verisi',
    decision: 'AL',
    decisionTier: 'good',
    decisionDetail: '4.7 yıldız · 1259 yorum',
  },
  after: {
    label: 'RÖNTGEN · GERÇEK',
    sub: 'Bağımsız ölçüm + çapraz kaynak',
    rating: 4.3,
    reviewCount: 1106,
    discount: 6,
    discountLabel: '%6',
    discountDetail: 'Son 30 gün dibi: 7400 ₺',
    battery: '22 sa 18 dk',
    batteryDetail: 'YouTube + forum ölçümü',
    anc: '−34 dB',
    ancDetail: 'Donanım Avcısı ölçümü',
    decision: 'KOŞULLU',
    decisionTier: 'warn',
    decisionDetail: '4.3 · 1106 doğrulanmış yorum',
  },
  comparisons: [
    {
      id: 'battery',
      label: 'Pil Ömrü',
      beforeVal: '30 sa',
      beforeSub: 'Apple iddiası · kutu üzeri',
      afterVal: '22 sa 18 dk',
      afterSub: 'YouTube + forum ölçümü',
      deltaLabel: '−27% SAPMA',
      severity: 'bad',
    },
    {
      id: 'anc',
      label: 'ANC Etkisi',
      beforeVal: '−38 dB',
      beforeSub: 'Üretici ölçüm verisi',
      afterVal: '−34 dB',
      afterSub: 'Donanım Avcısı · bağımsız',
      deltaLabel: '−11% DÜŞÜK',
      severity: 'warn',
    },
    {
      id: 'discount',
      label: 'İndirim Oranı',
      beforeVal: '%22',
      beforeSub: '9.999 ₺ → 7.849 ₺ etiket',
      afterVal: '%6',
      afterSub: 'Son 30 gün dibi: 7.400 ₺',
      deltaLabel: 'YANILTICI',
      severity: 'bad',
    },
    {
      id: 'rating',
      label: 'Yorum Puanı',
      beforeVal: '4.7 ★',
      beforeSub: '1.259 değerlendirme',
      afterVal: '4.3 ★',
      afterSub: '1.106 doğrulanmış değerlendirme',
      deltaLabel: '−9% SAPMA',
      severity: 'warn',
    },
    {
      id: 'mic',
      label: 'Mikrofon',
      beforeVal: '4.6 ★',
      beforeSub: 'HB özellik yıldızı',
      afterVal: '3.9 ★',
      afterSub: 'Forum + video ortalaması',
      deltaLabel: '−15% DÜŞÜK',
      severity: 'warn',
    },
    {
      id: 'comfort',
      label: 'Konfor & Fit',
      beforeVal: '4.8 ★',
      beforeSub: 'Trendyol ortalama puanı',
      afterVal: '4.2 ★',
      afterSub: 'Uzun süreli kullanım yorumları',
      deltaLabel: '−13% DÜŞÜK',
      severity: 'warn',
    },
  ],
  hb_summary: {
    ses_kalitesi: 4.8,
    mikrofon_kalitesi: 4.3,
    sarj_performansi: 4.6,
    malzeme_kalitesi: 4.5,
    kullanim_kolayligi: 4.7,
    goruntu_kalitesi: 4.2,
    fiyat_performans: 4.0,
    konfor: 4.4
  },
  category_scores: CATEGORY_SCORES,
};

export const SEARCH_HISTORY = [
  {
    id: 'h-0247', fileNo: '0247', name: 'Apple AirPods Pro (2. Nesil)', category: 'KULAKLIK · TWS',
    image: 'EARBUDS', query: 'Apple AirPods Pro 2', when: '3 dk önce', whenAbs: '2026.05.16 · 14:23',
    bucket: 'today', pinned: true, trustScore: 72, signals: 28,
    sources: { reviews: 1259, forum: 142, video: 4 },
    decision: 'KOŞULLU AL', decisionTier: 'warn', matchScore: 82,
    headline: 'Pil iddiası %26 sapmalı · ANC tutarlı', runtime: '23.4s', current: true,
  },
  {
    id: 'h-0246', fileNo: '0246', name: 'Sony WF-1000XM5', category: 'KULAKLIK · TWS',
    image: 'EARBUDS', query: 'Sony WF-1000XM5', when: '38 dk önce', whenAbs: '2026.05.16 · 13:48',
    bucket: 'today', trustScore: 84, signals: 9,
    sources: { reviews: 894, forum: 218, video: 6 },
    decision: 'AL', decisionTier: 'good', matchScore: 88,
    headline: 'Karşılaştırma için açıldı · ANC +3 dB lider', runtime: '21.7s',
  },
  {
    id: 'h-0245', fileNo: '0245', name: 'Xiaomi Redmi Buds 5 Pro', category: 'KULAKLIK · TWS',
    image: 'EARBUDS', query: 'Redmi Buds 5 Pro', when: '2 sa önce', whenAbs: '2026.05.16 · 12:11',
    bucket: 'today', trustScore: 61, signals: 19,
    sources: { reviews: 2417, forum: 64, video: 3 },
    decision: 'KOŞULLU AL', decisionTier: 'warn', matchScore: 58,
    headline: 'Yorum havuzu şişkin · 11% yüksek şüphe', runtime: '24.1s',
  },
  {
    id: 'h-0244', fileNo: '0244', name: 'JBL Tune Buds', category: 'KULAKLIK · TWS',
    image: 'EARBUDS', query: 'jbl tune buds', when: 'Dün 22:04', whenAbs: '2026.05.15 · 22:04',
    bucket: 'week', trustScore: 44, signals: 41,
    sources: { reviews: 612, forum: 28, video: 2 },
    decision: 'ALMA', decisionTier: 'bad', matchScore: 31,
    headline: '4 ay önce de aynı %40 indirim · fiyat oyunu', runtime: '19.8s',
  },
  {
    id: 'h-0243', fileNo: '0243', name: 'iPhone 15 Pro Max 256 GB', category: 'TELEFON · FLAGSHIP',
    image: 'PHONE', query: 'iPhone 15 Pro Max 256', when: 'Dün 17:32', whenAbs: '2026.05.15 · 17:32',
    bucket: 'week', trustScore: 88, signals: 6,
    sources: { reviews: 3142, forum: 421, video: 9 },
    decision: 'AL', decisionTier: 'good', matchScore: 91,
    headline: 'Yorum havuzu temiz · fiyat 2. el lehine değil', runtime: '26.0s',
  },
  {
    id: 'h-0242', fileNo: '0242', name: 'Logitech MX Master 3S', category: 'PERİFERİ · MOUSE',
    image: 'MOUSE', query: 'mx master 3s', when: '3 gün önce', whenAbs: '2026.05.13 · 10:18',
    bucket: 'week', trustScore: 91, signals: 3,
    sources: { reviews: 1817, forum: 88, video: 5 },
    decision: 'AL', decisionTier: 'good', matchScore: 94,
    headline: 'Çapraz kaynak %100 uyumlu · sinyal yok', runtime: '17.9s',
  },
  {
    id: 'h-0241', fileNo: '0241', name: 'Samsung Galaxy Buds3 Pro', category: 'KULAKLIK · TWS',
    image: 'EARBUDS', query: 'galaxy buds3 pro', when: '5 gün önce', whenAbs: '2026.05.11 · 21:55',
    bucket: 'week', trustScore: 67, signals: 16,
    sources: { reviews: 998, forum: 132, video: 4 },
    decision: 'KOŞULLU AL', decisionTier: 'warn', matchScore: 54,
    headline: 'Galaxy dışında ekosistem cezası ağır', runtime: '22.3s',
  },
  {
    id: 'h-0240', fileNo: '0240', name: 'Anker Soundcore Liberty 4 NC', category: 'KULAKLIK · TWS',
    image: 'EARBUDS', query: 'soundcore liberty 4 nc', when: '12 gün önce', whenAbs: '2026.05.04 · 09:12',
    bucket: 'older', trustScore: 78, signals: 7,
    sources: { reviews: 1456, forum: 47, video: 3 },
    decision: 'AL', decisionTier: 'good', matchScore: 79,
    headline: 'Fiyat/performans · sınıfının en temizi', runtime: '20.5s',
  },
  {
    id: 'h-0239', fileNo: '0239', name: 'Dyson V15 Detect Absolute', category: 'EV · SÜPÜRGE',
    image: 'VACUUM', query: 'dyson v15 detect', when: '3 hafta önce', whenAbs: '2026.04.25 · 19:40',
    bucket: 'older', trustScore: 54, signals: 24,
    sources: { reviews: 742, forum: 188, video: 5 },
    decision: 'KOŞULLU AL', decisionTier: 'warn', matchScore: 46,
    headline: 'Üretici emiş iddiası ölçümle %18 sapıyor', runtime: '28.6s',
  },
  {
    id: 'h-0238', fileNo: '0238', name: 'Trendyol "İndirimli Saç Düzleştirici"', category: 'KİŞİSEL BAKIM',
    image: 'STYLER', query: 'https://trendyol.com/...', when: '1 ay önce', whenAbs: '2026.04.16 · 14:08',
    bucket: 'older', trustScore: 22, signals: 53,
    sources: { reviews: 4128, forum: 12, video: 1 },
    decision: 'ALMA', decisionTier: 'bad', matchScore: 9,
    headline: '%63 yorum kümesi koordineli · yüksek risk', runtime: '31.2s',
  },
];

export const MOCK_PRODUCT_ASUS = {
  isMockProduct: true,
  id: 'asus-tuf-a15',
  name: 'Asus TUF Gaming A15',
  category: 'Dizüstü Bilgisayar',
  category_scores: [
    { key: 'perf', name: 'Performans', score: 92, sentiment: { pos: 512, neg: 28 }, top: 'RTX 4060 ve Ryzen 7 son derece güçlü.', verdict: 'good' },
    { key: 'cooling', name: 'Soğutma', score: 58, sentiment: { pos: 120, neg: 340 }, top: 'Yük altında CPU 92°C-95°C sıcaklığa ulaşıyor. Fanlar gürültülü.', verdict: 'bad' },
    { key: 'display', name: 'Ekran', score: 72, sentiment: { pos: 210, neg: 90 }, top: '144Hz akıcı ama %100 sRGB olmadığı için renkler soluk.', verdict: 'warn' },
    { key: 'battery', name: 'Pil Ömrü', score: 85, sentiment: { pos: 380, neg: 40 }, top: '90Wh pil günlük kullanımda 7-8 saat sunuyor (sınıf lideri).', verdict: 'good' },
    { key: 'build', name: 'Kasa Kalitesi', score: 76, sentiment: { pos: 280, neg: 60 }, top: 'Askeri sınıf dayanıklılık, ama sert plastik yoğunlukta.', verdict: 'warn' },
  ],
  crossSourceConflicts: [
    {
      id: 'ac-001',
      topic: 'Sıcaklık ve Termal Limitler',
      severity: 'high',
      summary: 'Üretici serin derken, testler ve forumlar yük altında CPU sıcaklığının 92°C-95°C\'ye ulaştığını gösteriyor.',
      statements: [
        { source: 'Üretici (Asus)', sourceType: 'manufacturer', value: 'Serin ve sessiz', stance: 'claim', detail: 'Çift fanlı termal soğutma tasarımı.', credibility: 'low' },
        { source: 'YouTube (PC Hocası)', sourceType: 'youtube', value: '92°C CPU sıcaklığı', stance: 'measured', detail: 'Ağır yük altında ısınma ve Turbo modda 52 dBA gürültü.', credibility: 'high' },
        { source: 'Forum konsensüsü', sourceType: 'forum', value: 'Sıcak çalışıyor', stance: 'experience', detail: 'Technopat ve DonanımHaber: "Isınma hissediliyor, stant şart".', credibility: 'high' },
        { source: 'E-ticaret yorumları', sourceType: 'ecommerce', value: '+142 / -45', stance: 'sentiment', detail: 'Kullanıcılar performanstan memnun ama fan sesinden şikayetçi.', credibility: 'medium' },
      ],
      resolution: 'Tasarım oyunlarda mükemmel FPS sunarken termal limitleri zorluyor. **Gerçek: ~92°C CPU sıcaklığı**. Uzun vadeli performans için stand önerilir.',
    },
    {
      id: 'ac-002',
      topic: 'Ekran Renk Doğruluğu',
      severity: 'medium',
      summary: 'Üretici iddialı ekran kalitesi sunarken, ölçümler renk gamutunun %62 sRGB olduğunu gösteriyor.',
      statements: [
        { source: 'Üretici (Asus)', sourceType: 'manufacturer', value: '%100 sRGB ekran', stance: 'claim', detail: 'Tasarım işleri için mükemmel renk kalitesi.', credibility: 'low' },
        { source: 'YouTube (Technopat)', sourceType: 'youtube', value: '%62 sRGB ölçüldü', stance: 'measured', detail: 'Renk doğruluğu profesyonel işler için zayıf.', credibility: 'high' },
        { source: 'Forum konsensüsü', sourceType: 'forum', value: 'Renkler biraz mat', stance: 'experience', detail: 'Kullanıcılar oyun için yeterli ama tasarım için soluk buluyor.', credibility: 'high' },
      ],
      resolution: 'Ekran 144Hz akıcılıkta başarılı fakat renk kapsamı **%62 sRGB** ile sınırlı. Tasarımcılar için yetersiz.',
    }
  ],
  sources: {
    trendyolReviews: 420,
    hepsiburadaReviews: 180,
    forumThreads: 12,
    youtubeVideos: 8,
    forumPosts: 310,
    donanimhaber: 180,
    technopat: 95,
    eksisozluk: 25,
    webtekno: 8,
    sikayetvar: 2,
    scraperAvailable: true,
    totalReviews: 600,
  },
  trustScore: 71,
  trustBreakdown: [
    { lbl: 'Forum', pct: 35, score: 62 },
    { lbl: 'YouTube', pct: 30, score: 78 },
    { lbl: 'E-ticaret', pct: 20, score: 82 },
    { lbl: 'İddia', pct: 15, score: 55 },
  ],
  dna: [
    { axis: 'Yorum', value: 24, label: 'Düşük Şüphe', tier: 'good', detail: '%6 yorum koordinasyon/reklam sinyali barındırıyor, e-ticaret yorumları ağırlıklı organik.' },
    { axis: 'Fiyat', value: 20, label: 'Temiz', tier: 'good', detail: '%12 indirim etiketi yapay; gerçek son-30-gün indirimi %4. Yine de piyasa ortalamasında.' },
    { axis: 'Görsel', value: 12, label: 'Temiz', tier: 'good', detail: 'Stüdyo görseli ile kullanıcı kutu açılışı fotoğrafları geometrisi tam uyuşmaktadır.' },
    { axis: 'İddia', value: 68, label: 'Yüksek Şüphe', tier: 'bad', detail: '"Serin soğutma" iddiası yalanlanıyor (92°C CPU). "Ekran %100 sRGB" iddiası sapıyor (gerçek %62 sRGB).' },
  ],
  videos: [
    {
      channel: 'PC Hocası',
      title: 'Asus TUF Gaming A15 Sıcaklık ve Fan Gürültüsü Testleri (12:15)',
      thumb: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      id: 'dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ',
      time: '15:20',
      moment: '12:15',
      startSec: 735,
      startAt: 735,
      conflict: { claimedLabel: 'Asus İddiası', claimed: 'Serin ve sessiz çalışma', actualLabel: 'Gerçek Test', actual: '92°C CPU / 52 dBA gürültü', bad: true },
      summary: 'PC Hocası yük altındaki testlerde işlemcinin 92°C\'ye ulaştığını ve fanların oldukça gürültülü (52 dBA) çalıştığını belirtiyor. Soğutma iddiası gerçekle çelişmektedir.',
    },
    {
      channel: 'Technopat',
      title: 'Asus TUF A15 90Wh Pil Dayanıklılık Testi (08:40)',
      thumb: 'https://img.youtube.com/vi/jNQXAC9IVRw/hqdefault.jpg',
      id: 'jNQXAC9IVRw',
      videoId: 'jNQXAC9IVRw',
      time: '12:45',
      moment: '08:40',
      startSec: 520,
      startAt: 520,
      conflict: { claimedLabel: 'Asus İddiası', claimed: '10 saat video izleme', actualLabel: 'Gerçek Test', actual: '7.5 saat günlük kullanım', bad: false },
      summary: 'Technopat 90Wh pil testinde günlük ofis ve video izleme işlerinde 7.5 saatlik bir pil ömrü elde etti. Bu iddia oyuncu bilgisayarı sınıfı için oldukça başarılı ve tutarlıdır.',
    }
  ],
  reviewers: [
    {
      channel: 'PC Hocası',
      handle: '@pchocasi',
      subscribers: '1.2M',
      trustScore: 88,
      tier: 'good',
      label: 'GÜVENİLİR',
      consistency: 90,
      sponsorshipRatio: 0.15,
      sponsorshipLabel: '%15',
      accuracyDelta: '+15%',
      accuracyNote: 'Kontrollü ortam testleri ve sıcaklık ölçümleri fiziksel limitlerle tam tutarlıdır.',
      signals: [
        { kind: 'good', text: 'Sponsorlu içerikleri her zaman videonun başında açıkça belirtmektedir.' },
        { kind: 'good', text: 'Sıcaklık testlerini oda sıcaklığını sabitleyerek dijital termometreyle gerçekleştirmektedir.' },
        { kind: 'warn', text: 'Kasa malzemesi plastik olmasına rağmen metalik boya kalitesini biraz fazla övmüştür.' },
      ],
      contribution: 'Bu kanalın termal ve akustik analizine **ağırlığı %40** olarak atanmıştır.',
    },
    {
      channel: 'Technopat',
      handle: '@technopat',
      subscribers: '1.8M',
      trustScore: 92,
      tier: 'good',
      label: 'YÜKSEK GÜVEN',
      consistency: 94,
      sponsorshipRatio: 0.10,
      sponsorshipLabel: '%10',
      accuracyDelta: '+8%',
      accuracyNote: 'Tüm testler ve söküm (teardown) videoları donanım şemasıyla %100 örtüşmektedir.',
      signals: [
        { kind: 'good', text: 'RAM ve SSD yükseltme adımlarını anakart üzerindeki koruyucu filmlere kadar gösteren söküm videosu.' },
        { kind: 'good', text: 'Sponsorlu işbirlikleri bağımsız testleri kesinlikle etkilemiyor.' },
      ],
      contribution: 'Bu kanalın donanım söküm ve iç yapı detay analizleri **referans alınmıştır** (ağırlık %45).',
    },
    {
      channel: 'Donanım Arşivi',
      handle: '@donanimarsivi',
      subscribers: '1.5M',
      trustScore: 82,
      tier: 'good',
      label: 'GÜVENİLİR',
      consistency: 85,
      sponsorshipRatio: 0.20,
      sponsorshipLabel: '%20',
      accuracyDelta: '+12%',
      accuracyNote: 'FPS testleri ve oyun benchmarkları gerçek oyuncu deneyimlerini doğrudan yansıtır.',
      signals: [
        { kind: 'good', text: 'Popüler 8 oyunda canlı FPS ve sıcaklık değerlerini anlık OSD ekranıyla sunmaktadır.' },
        { kind: 'warn', text: 'Fabrika çıkışlı RAM konfigürasyonunun tek kanal olmasının yarattığı darboğazı detaylıca açıklamamış.' },
      ],
      contribution: 'Bu kanalın canlı oyun testleri ve performans ölçümlerine **ağırlığı %35** olarak atanmıştır.',
    }
  ],
  alternatives: [
    {
      id: 'lenovo-loq-15',
      name: 'Lenovo LOQ 15',
      image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&auto=format&fit=crop&q=80',
      category: 'Dizüstü Bilgisayar',
      price: 32999,
      priceTag: '%10 gerçek indirim',
      priceTagTier: 'good',
      trustScore: 84,
      decision: 'AL',
      decisionTier: 'good',
      matchScore: 88,
      matchReason: 'Soğutma sistemi çok daha sessiz ve serin çalışıyor. Ekran %100 sRGB. Pil 60Wh (TUF\'tan daha zayıf).',
      strengthDelta: '+Ekran kalitesi, +Daha serin',
      weaknessDelta: '−Zayıf pil (60Wh)',
      cached: false,
    },
    {
      id: 'acer-nitro-v15',
      name: 'Acer Nitro V15',
      image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&auto=format&fit=crop&q=80',
      category: 'Dizüstü Bilgisayar',
      price: 29999,
      priceTag: '%5 gerçek indirim',
      priceTagTier: 'good',
      trustScore: 78,
      decision: 'AL',
      decisionTier: 'good',
      matchScore: 80,
      matchReason: 'Fiyatı 5K ₺ daha ucuz, tam bir bütçe dostu oyuncu bilgisayarı. Kasa kalitesi tamamen plastik.',
      strengthDelta: '−5K ₺ fiyat',
      weaknessDelta: '−Kasa plastik kalitesi',
      cached: false,
    }
  ],
  decision: {
    badge: 'AL',
    tier: 'good',
    summary: 'Asus TUF Gaming A15 senin için **önerilir**. Fiyat/performans oranı, RTX 4060 gücü ve 90Wh pil ömrü sınıfında rakipsiz; ancak "soğutma ve fan gürültüsü" ile "ekran renk doğruluğu" konularında beklentiyi yönetmen gerekir.',
    detail: 'Senin "Oyun öncelikli, pil performansı önemli" profilinde uyum skoru **85/100**. Oyunlarda mükemmel performans verirken termal limitleri zorlayabilir. Kulaklıkla kullanımda sıfır sorun sunar.',
    pros: [
      'RTX 4060 + Ryzen 7 performans canavarı (iddiasıyla tutarlı)',
      '90Wh devasa pil ile günlük 7-8 saat ofis kullanımı',
      'Stüdyo geometrisi ↔ gerçek kasa detayları kusursuz uyuşuyor',
    ],
    cons: [
      'Yük altında CPU 92°C\'yi aşmaktadır (termal kısma oluşabilir)',
      'Ekran sadece %62 sRGB destekliyor, profesyonel işler için renk doğruluğu yetersiz',
      'Turbo fan modu gürültülü (52 dBA)',
    ],
  },
  challenger: {
    title: 'Şeytanın Avukatı — Bu kararı sorgula',
    points: [
      'Eğer grafik tasarım veya profesyonel fotoğrafçılık yapacaksan: Ekranın %62 sRGB olması renkleri soluk gösterecektir. %100 sRGB panele sahip Lenovo LOQ 15 daha mantıklı bir tercih olabilir.',
      'Eğer oda arkadaşın veya sessiz ortam önceliğinse: Turbo modundaki 52 dBA fan sesi aşırı gürültülüdür. Kulaklık takmadan uzun süre oyun oynamak yorucu olabilir.',
      'Fiyat etiketi aldatmacası: %12 indirim yapaydır. Gerçek son-30-gün indirimi %4 seviyesindedir. Fiyatın 34.000 ₺ altına düşmesini beklemek mantıklı olabilir.',
    ],
  },
  imageVerification: {
    matchScore: 94,
    matchTier: 'good',
    matchLabel: 'YÜKSEK UYUM',
    studio: { lbl: 'STÜDYO · ASUS', sub: 'asus.com/tuf-a15 · 2400×2400 · RGB', img: asusStudio },
    real: { lbl: 'GERÇEK · YOUTUBE', sub: '@pchocasi · 12:15 keyframe · 1080p', img: asusReal },
    hotspots: [
      { id: 1, studio: { x: 45, y: 35 }, real: { x: 45, y: 35 }, label: 'Ekran Menteşeleri & Çerçeve Uyumu' },
      { id: 2, studio: { x: 50, y: 65 }, real: { x: 50, y: 65 }, label: 'Klavye & Touchpad Alanı' },
      { id: 3, studio: { x: 80, y: 80 }, real: { x: 80, y: 80 }, label: 'Hava Izgaraları & Kasa Altı' },
    ],
    findings: [
      { tier: 'good', pct: 96, label: 'Ekran Menteşeleri & Çerçeve Uyumu', note: 'Üreticinin stüdyo render\'ı ile gerçek kutu açılışı fotoğrafındaki ekran menteşeleri milimetrik olarak eşleşti.' },
      { tier: 'good', pct: 92, label: 'Klavye & Touchpad Konumu', note: 'Tuş takımı dizilimi, Türkçe Q klavye entegrasyonu ve touchpad konumlandırması stüdyo şeması ile birebir örtüşüyor.' },
      { tier: 'good', pct: 94, label: 'Hava Izgaraları Yerleşimi', note: 'Kasa altındaki ve yan taraflardaki petek tasarımlı hava tahliye ızgaralarının yerleşimi stüdyo şeması ile tamamen uyumludur.' },
    ],
    verdict: 'Stüdyo render\'ı fiziksel ürünle **son derece yüksek uyum göstermektedir**. Yapay zeka karşılaştırmamızda, Asus TUF A15\'in ekran çerçeve kalınlığı, klavye RGB homojenliği ve alt hava tahliye ızgaraları geometrik olarak kusursuz bir şekilde eşleşmiş ve doğrulanmıştır.',
  },
  chatHistory: [
    { from: 'user', text: 'Sıcaklık değerleri endişelendirmeli mi?' },
    {
      from: 'bot',
      agent: 'Challenger',
      text: 'Evet, yük altında **92°C-95°C CPU sıcaklığı** yüksek bir değerdir. Her ne kadar bileşenler bu sıcaklığa dayanıklı tasarlanmış olsa da, uzun vadeli kullanımda termal macun ömrünü kısaltabilir veya termal kısma (thermal throttling) nedeniyle anlık FPS düşüşlerine yol açabilir. Ekstra bir laptop soğutucu stand kullanılması şiddetle tavsiye edilir.',
    },
    { from: 'user', text: 'Lenovo LOQ ile karşılaştırır mısın?' },
    {
      from: 'bot',
      agent: 'Advisor',
      text: '**Hızlı kıyaslama**:\n\n• **Performans**: Eşitalan (RTX 4060 ikisinde de mevcut).\n• **Soğutma**: Lenovo LOQ daha başarılı ve sessiz (~45 dBA).\n• **Ekran**: LOQ %100 sRGB sunarak daha canlı ve doğru renkler sunarken, TUF %62 sRGB ile soluk kalıyor.\n• **Pil**: TUF (90Wh, 8 saat) ezici şekilde LOQ\'u (60Wh, 4 saat) geçiyor.\n\n**Karar**: Eğer seyahat ediyor ve pilde uzun süre kullanıyorsan TUF; evde sabit prizde kullanacaksan LOQ çok daha mantıklı.',
    },
  ],
  suggestions: [
    'Sıcaklığı düşürmek için ne yapabilirim?',
    'Lenovo LOQ 15 ile detaylı kıyasla',
    'Ekran kalitesi günlük kullanımda sırıtır mı?',
    'Kasa malzemesi uzun ömürlü mü?',
  ],
};

export const XRAY_REVEAL_ASUS = {
  before: {
    label: 'YÜZEY · ÜRETİCİ GÖZÜ',
    sub: 'E-ticaret + üretici iddiası',
    rating: 4.8,
    reviewCount: 600,
    discount: 12,
    discountLabel: '%12',
    discountDetail: 'Etiket: 39999 ₺ → 34999 ₺',
    battery: '10 sa',
    batteryDetail: 'Asus iddiası',
    anc: 'Serin & Sessiz',
    ancDetail: 'Akıllı Soğutma İddiası',
    decision: 'AL',
    decisionTier: 'good',
    decisionDetail: '4.8 yıldız · 600 yorum',
  },
  after: {
    label: 'RÖNTGEN · GERÇEK',
    sub: 'Bağımsız ölçüm + çapraz kaynak',
    rating: 4.5,
    reviewCount: 564,
    discount: 4,
    discountLabel: '%4',
    discountDetail: 'Son 30 gün dibi: 33500 ₺',
    battery: '7 sa 30 dk',
    batteryDetail: 'YouTube + forum testi',
    anc: '92°C CPU / 52dBA',
    ancDetail: 'Yük altında sıcaklık ve gürültü',
    decision: 'AL',
    decisionTier: 'good',
    decisionDetail: '4.5 · 564 doğrulanmış yorum',
  },
  comparisons: [
    {
      id: 'cooling',
      label: 'Sıcaklık & Gürültü',
      beforeVal: 'Serin & Sessiz',
      beforeSub: 'Fabrika iddiası',
      afterVal: '92°C / 52 dBA',
      afterSub: 'PC Hocası ölçümü',
      deltaLabel: 'YÜKSEK SICAKLIK',
      severity: 'bad',
    },
    {
      id: 'display',
      label: 'Ekran Renk Gamutu',
      beforeVal: '%100 sRGB',
      beforeSub: 'Lansman beyanı',
      afterVal: '%62 sRGB',
      afterSub: 'Bağımsız kolorimetre testi',
      deltaLabel: 'SOLUK RENKLER',
      severity: 'warn',
    },
    {
      id: 'battery',
      label: 'Pil Ömrü',
      beforeVal: '10 sa',
      beforeSub: 'Asus video oynatma iddiası',
      afterVal: '7 sa 30 dk',
      afterSub: 'Technopat testi',
      deltaLabel: 'TUTARLI-İYİ',
      severity: 'good',
    },
    {
      id: 'discount',
      label: 'İndirim Oranı',
      beforeVal: '%12',
      beforeSub: '39.999 ₺ → 34.999 ₺ etiket',
      afterVal: '%4',
      afterSub: 'Son 30 gün dibi: 33.500 ₺',
      deltaLabel: 'ALDATICI',
      severity: 'bad',
    },
    {
      id: 'rating',
      label: 'Yorum Puanı',
      beforeVal: '4.8 ★',
      beforeSub: '600 değerlendirme',
      afterVal: '4.5 ★',
      afterSub: '564 doğrulanmış değerlendirme',
      deltaLabel: 'HAFİF SAPMA',
      severity: 'warn',
    },
  ],
  hb_summary: {
    ses_kalitesi: 4.3,
    mikrofon_kalitesi: 4.1,
    sarj_performansi: 4.7,
    malzeme_kalitesi: 4.2,
    kullanim_kolayligi: 4.6,
    goruntu_kalitesi: 4.0,
    fiyat_performans: 4.5,
    konfor: 4.3
  },
  category_scores: [
    { key: 'perf', name: 'Performans', score: 92, positiveCount: 512, negativeCount: 28, topFinding: 'RTX 4060 ve Ryzen 7 son derece güçlü.' },
    { key: 'cooling', name: 'Soğutma', score: 58, positiveCount: 120, negativeCount: 340, topFinding: 'Yük altında CPU 92°C-95°C sıcaklığa ulaşıyor.' },
    { key: 'display', name: 'Ekran', score: 72, positiveCount: 210, negativeCount: 90, topFinding: '144Hz akıcı ama %62 sRGB.' },
    { key: 'battery', name: 'Pil Ömrü', score: 85, positiveCount: 380, negativeCount: 40, topFinding: '90Wh pil günlük 7-8 saat sunuyor.' },
    { key: 'build', name: 'Kasa Kalitesi', score: 76, positiveCount: 280, negativeCount: 60, topFinding: 'Askeri sınıf dayanıklılık.' },
  ],
};

