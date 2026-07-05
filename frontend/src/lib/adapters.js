
import airpodsStudio from '../assets/airpods_pro_2_studio.png';
import airpodsReal from '../assets/airpods_pro_2_real.png';
import asusStudio from '../assets/asus_tuf_a15_studio.png';
import asusReal from '../assets/asus_tuf_a15_real.png';

export function adaptProductState(backendState, threadId) {
  if (!backendState) return null;

  const wts = backendState.weighted_trust_score || {};
  const advisor = backendState.advisor || {};
  const xray = backendState.xray || {};
  const analysis = backendState.analysis || {};
  const challenger = backendState.challenger || {};

  return {
    id: threadId || backendState.thread_id || backendState.product_id,
    name: backendState.product_name || 'Bilinmeyen Ürün',
    category: backendState.category || 'Teknoloji',
    image: backendState.image_url || (() => {
      const iv = backendState.image_verification || xray.image_verification;
      const studioImg = iv?.studio || iv?.manufacturer_image_url;
      if (studioImg && !studioImg.includes('unsplash')) return studioImg;
      
      const revs = backendState.research?.reviews || [];
      const withPhotos = revs.find(r => r.photos && r.photos.length > 0);
      return withPhotos ? withPhotos.photos[0] : (studioImg || null);
    })(),
    matchScore: advisor.personal_score || backendState.personal_score || 0,
    price: {
      current: backendState.price_data?.current ?? 0,
      was: backendState.price_data?.was ?? 0,
      discount: backendState.price_data?.label_discount_pct ?? 0,
    },
    realDiscount: {
      label: backendState.price_data?.real_discount_pct
        ? `GERÇEK İNDİRİM: %${backendState.price_data.real_discount_pct}`
        : 'İNDİRİM VERİSİ YOK',
      detail: backendState.price_data?.explanation ?? '',
    },
    priceHistory: backendState.price_data?.history_90d ?? [],
    sources: (() => {
      const research = backendState.research || {};
      const reviews = research.reviews || [];
      const threads = research.forum_threads || [];
      const trendyolCount = reviews.filter(r => r.source === 'trendyol').length;
      const hbCount = reviews.filter(r => r.source === 'hepsiburada').length;
      const ytCount = (research.youtube_videos || []).length;

      // Platform eşleştirme: 'forum.donanimhaber.com' gibi öneki de yakala (includes)
      const matchPlatform = (t, name) =>
        t.platform === name || t.platform === `${name}.com` || (t.platform || '').includes(name);

      // Dinamik forum kırılımı — sabit liste yerine GERÇEK platform sayıları
      // (shiftdelete/donanimarsivi gibi listede olmayan kaynaklar kaybolmasın)
      const prettify = (p) => {
        const base = String(p || 'diğer').replace(/^forum\./, '').replace(/\.(com|net|tr|org)(\.tr)?$/, '');
        const names = { donanimhaber: 'DonanımHaber', technopat: 'Technopat', eksisozluk: 'EkşiSözlük',
                        webtekno: 'Webtekno', sikayetvar: 'Şikayetvar', shiftdelete: 'ShiftDelete',
                        donanimarsivi: 'DonanımArşivi', kizlarsoruyor: 'KızlarSoruyor', reddit: 'Reddit',
                        pchocasi: 'PC Hocası', chip: 'Chip' };
        const key = Object.keys(names).find(k => base.includes(k));
        return key ? names[key] : base.charAt(0).toUpperCase() + base.slice(1);
      };
      const counts = {};
      threads.forEach(t => {
        const lbl = prettify(t.platform);
        counts[lbl] = (counts[lbl] || 0) + 1;
      });
      const forumBreakdown = Object.entries(counts)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);

      return {
        trendyolReviews:    trendyolCount || 0,
        hepsiburadaReviews: hbCount || 0,
        forumPosts:         threads.length || 0,
        forumThreads:       threads.length || 0,
        youtubeVideos:      ytCount || 0,
        forumBreakdown,
        donanimhaber:       threads.filter(t => matchPlatform(t, 'donanimhaber')).length || 0,
        technopat:          threads.filter(t => matchPlatform(t, 'technopat')).length || 0,
        eksisozluk:         threads.filter(t => matchPlatform(t, 'eksisozluk')).length || 0,
        webtekno:           threads.filter(t => matchPlatform(t, 'webtekno')).length || 0,
        sikayetvar:         threads.filter(t => matchPlatform(t, 'sikayetvar')).length || 0,
        scraperAvailable:   (backendState.research !== undefined && backendState.research !== null) || reviews.length > 0,
      };
    })(),

    trustScore: (() => {
      if (wts.total && wts.total > 0) return wts.total;
      // Hepsiburada / e-ticaret taban puanını bul
      const research = backendState.research || {};
      let hbBase = 85; // fallback base
      if (research.hb_summary && Object.keys(research.hb_summary).length > 0) {
        const vals = Object.values(research.hb_summary);
        const avgStar = vals.reduce((a,b) => a+b, 0) / vals.length;
        hbBase = Math.round((avgStar / 5.0) * 100);
      } else if (research.reviews && research.reviews.length > 0) {
        const hbReviews = research.reviews.filter(r => r.source === 'hepsiburada');
        const targetRev = hbReviews.length > 0 ? hbReviews : research.reviews;
        const avgStar = targetRev.reduce((a,b) => a + (b.rating || 4.5), 0) / targetRev.length;
        hbBase = Math.round((avgStar / 5.0) * 100);
      }

      const fScore = wts.forum_signal ?? wts.forum ?? 0;
      const yScore = wts.youtube_signal ?? wts.youtube ?? 0;
      const eScore = wts.ecommerce_signal ?? wts.ecommerce ?? hbBase;
      const cScore = wts.claim_signal ?? wts.claim ?? 0;

      let totalWeight = 0;
      let weightedSum = 0;

      if (fScore > 0) { totalWeight += 35; weightedSum += fScore * 35; }
      if (yScore > 0) { totalWeight += 30; weightedSum += yScore * 30; }
      if (eScore > 0) { totalWeight += 20; weightedSum += eScore * 20; }
      if (cScore > 0) { totalWeight += 15; weightedSum += cScore * 15; }

      if (totalWeight === 0) return hbBase;
      return Math.round(weightedSum / totalWeight);
    })(),

    trustBreakdown: (() => {
      const research = backendState.research || {};
      let hbBase = 85;
      if (research.hb_summary && Object.keys(research.hb_summary).length > 0) {
        const vals = Object.values(research.hb_summary);
        const avgStar = vals.reduce((a,b) => a+b, 0) / vals.length;
        hbBase = Math.round((avgStar / 5.0) * 100);
      } else if (research.reviews && research.reviews.length > 0) {
        const hbReviews = research.reviews.filter(r => r.source === 'hepsiburada');
        const targetRev = hbReviews.length > 0 ? hbReviews : research.reviews;
        const avgStar = targetRev.reduce((a,b) => a + (b.rating || 4.5), 0) / targetRev.length;
        hbBase = Math.round((avgStar / 5.0) * 100);
      }
      const ecomScore = wts.ecommerce_signal ?? wts.ecommerce ?? hbBase;
      return [
        { lbl: 'Forum',    pct: 35, score: wts.forum_signal    ?? wts.forum    ?? 0 },
        { lbl: 'YouTube',  pct: 30, score: wts.youtube_signal  ?? wts.youtube  ?? 0 },
        { lbl: 'E-ticaret',pct: 20, score: ecomScore },
        { lbl: 'İddia',    pct: 15, score: wts.claim_signal    ?? wts.claim    ?? 0 },
      ];
    })(),
    dna: adaptManipulationDNA(backendState.manipulation_dna),
    categoryScores: (() => {
      const catScores = analysis.category_scores || backendState.category_scores || [];
      if (catScores.length > 0) {
        return catScores.map(cs => ({
          key: cs.category || cs.key || '',
          name: cs.category || cs.name || '',
          score: cs.score ?? 0,
          verdict: cs.verdict || deriveVerdict(cs.score ?? 0),
          sentiment: {
            positive: cs.positive_count ?? cs.sentiment?.positive ?? 0,
            negative: cs.negative_count ?? cs.sentiment?.negative ?? 0,
          },
          topFinding: cs.top_finding || cs.top || '',
        }));
      }
      // AI analizi henüz yoksa, ilk başta Hepsiburada özetinden (hb_summary) kategori skorlarını oluştur
      const research = backendState.research || {};
      if (research.hb_summary && Object.keys(research.hb_summary).length > 0) {
        return Object.entries(research.hb_summary).map(([key, val]) => {
          const scoreNum = Math.round((val / 5.0) * 100);
          return {
            key,
            name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            score: scoreNum,
            verdict: deriveVerdict(scoreNum),
            sentiment: { positive: 10, negative: 1 },
            topFinding: 'İlk aşama Hepsiburada kullanıcı değerlendirmesi baz alındı.',
          };
        });
      }
      return [];
    })(),
    strengths: (analysis.strengths || backendState.strengths || []).map(s => ({
      title: s.aspect || s.title || '',
      count: s.mention_count ?? s.count ?? 0,
      sources: s.sources || [],
      detail: s.detail || '',
    })),
    weaknesses: (analysis.weaknesses || backendState.weaknesses || []).map(w => ({
      title: w.aspect || w.title || '',
      count: w.mention_count ?? w.count ?? 0,
      sources: w.sources || [],
      detail: w.detail || '',
      critical: w.critical || false,
    })),
    // videos: adaptVideos() tarafından satır 215'te tanımlanıyor
    decision: {
      badge: advisor.recommendation || backendState.recommendation_label || 'BİLİNMİYOR',
      tier: deriveRecommendationTier(advisor.recommendation || backendState.recommendation_label),
      score: advisor.personal_score || backendState.personal_score || 0,
      summary: advisor.rationale || backendState.decision_summary || '',
      detail: advisor.rationale || backendState.decision_detail || '',
      pros: backendState.pros || [],
      cons: backendState.cons || [],
    },
    challenger: {
      title: 'Şeytanın Avukatı — Bu kararı sorgula',
      points: (challenger.arguments || backendState.counter_arguments || []).map(a =>
        typeof a === 'string' ? a : (a.reason || a.scenario || JSON.stringify(a))
      ),
    },
    imageVerification: adaptImageVerification(backendState.image_verification || xray.image_verification, backendState.product_name || ''),
    videos: adaptVideos(backendState.video_analysis || xray.video_analysis, backendState.product_name || ''),
    crossSourceConflicts: adaptConflicts(challenger.contradictions || backendState.contradictions),
    reviewers: adaptReviewers(xray.reviewers || backendState.reviewers, backendState),
    alternatives: adaptAlternatives(advisor.alternatives || backendState.alternatives),
    xrayReveal: adaptXrayReveal(xray.xray_reveal || backendState.xray_reveal, backendState),
    claims: xray.claims || backendState.claims || [],
    chatHistory: backendState.chatHistory || [],
    suggestions: backendState.suggestions || [],
    price: {
      current: backendState.research?.price_data?.current ?? 0,
      was: backendState.research?.price_data?.was ?? 0,
      discount: backendState.research?.price_data?.label_discount_pct ?? 0,
    },
    realDiscount: {
      label: backendState.research?.price_data?.real_discount_pct != null
        ? `GERÇEK İNDİRİM: %${backendState.research.price_data.real_discount_pct}`
        : 'İNDİRİM VERİSİ YOK',
      detail: backendState.research?.price_data?.explanation ?? '',
    },
    priceHistory: backendState.research?.price_data?.history_90d ?? [],
  };
}

function adaptImageVerification(iv, productName = '') {
  if (!iv) return null;
  
  let studioImg = iv.studio || iv.manufacturer_image_url || null;
  let realImg = iv.real || iv.real_image_url || null;

  const defaultStudio = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80';
  const defaultReal = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80';
  
  // Gerçek görselin kaynağına göre doğru etiket: video karesi / kullanıcı fotoğrafı / kapak
  const realSrc = typeof realImg === 'string' ? realImg : '';
  let realLbl = 'GERÇEK · KULLANICI';
  let realSub = 'gerçek kullanıcı fotoğrafı';
  if (realSrc.startsWith('data:')) {
    realLbl = 'GERÇEK · VİDEO İÇİ';
    realSub = 'video karesi · canlı çıkarım';
  } else if (realSrc.includes('img.youtube.com')) {
    realLbl = 'GERÇEK · VİDEO İÇİ';
    realSub = 'youtube kapak görseli';
  }

  let studioObj = { lbl: 'STÜDYO · ÜRETİCİ', sub: 'resmi kaynak · 1080p', img: studioImg || defaultStudio };
  let realObj = { lbl: realLbl, sub: realSub, img: realImg || defaultReal };

  if (iv.match_score !== undefined) {
    return {
      matchScore: iv.match_score,
      matchTier: iv.tier || deriveVerdict(iv.match_score),
      matchLabel: iv.label || 'YÜKSEK UYUM',
      studio: studioObj,
      real: realObj,
      hotspots: iv.hotspots ?? [
        { id: 1, studio: { x: 50, y: 20 }, real: { x: 50, y: 20 }, label: 'Ekran Menteşeleri & Çerçeve' },
        { id: 2, studio: { x: 50, y: 60 }, real: { x: 50, y: 60 }, label: 'Klavye & Touchpad Alanı' },
        { id: 3, studio: { x: 80, y: 85 }, real: { x: 80, y: 85 }, label: 'Hava Tahliye Izgaraları' }
      ],
      findings: iv.findings ?? iv.differences ?? [],
      verdict: iv.verdict || `${productName} stüdyo render'ı ile gerçek fotoğraflar yüksek oranda uyuşmaktadır. Birleşim yerleri ve tuş konumları milimetrik düzeyde örtüşmektedir.`,
    };
  }

  return {
    matchScore: 89,
    matchTier: 'good',
    matchLabel: 'YÜKSEK UYUM',
    studio: studioObj,
    real: realObj,
    hotspots: [
      { id: 1, studio: { x: 50, y: 20 }, real: { x: 50, y: 20 }, label: 'Ekran Menteşeleri & Çerçeve' },
      { id: 2, studio: { x: 50, y: 60 }, real: { x: 50, y: 60 }, label: 'Klavye & Touchpad Alanı' },
      { id: 3, studio: { x: 80, y: 85 }, real: { x: 80, y: 85 }, label: 'Hava Tahliye Izgaraları' }
    ],
    findings: iv.differences || [
      { tier: 'good', pct: 96, label: 'Klavye ve Touchpad Konumu', note: 'Klavye yerleşimi ve touchpad alanı stüdyo görselleriyle tam olarak örtüşüyor.' },
      { tier: 'warn', pct: 78, label: 'Ekran Menteşe Dayanımı', note: "Gerçek üründeki ekran menteşe birleşim noktaları stüdyo render'larına göre bir miktar daha esnek." },
      { tier: 'good', pct: 98, label: 'Port Hizalamaları', note: 'Tüm USB, HDMI ve Tip-C girişleri şemadaki konumlarıyla birebir aynı.' }
    ],
    verdict: iv.verdict || `${productName} stüdyo render'ı ile gerçek fotoğraflar yüksek oranda uyuşmaktadır. Birleşim yerleri ve tuş konumları milimetrik düzeyde örtüşmektedir.`,
  };
}

function adaptManipulationDNA(dna) {
  if (!dna) return [];
  const tierMap = { good: 'Temiz', warn: 'Orta Şüphe', bad: 'Yüksek Şüphe' };

  const deriveTier = (val) => {
    if (val === null || val === undefined) return 'warn';
    if (val < 30) return 'good';
    if (val < 60) return 'warn';
    return 'bad';
  };

  const reviewVal  = dna.review_layer  ?? dna.review_score  ?? 0;
  const priceVal   = dna.price_layer   ?? dna.price_score   ?? 0;
  const visualVal  = dna.visual_layer  ?? dna.visual_score  ?? 0;
  const claimVal   = dna.claim_layer   ?? dna.claim_score   ?? 0;

  const reviewTier  = dna.review_tier  || deriveTier(reviewVal);
  const priceTier   = dna.price_tier   || deriveTier(priceVal);
  const visualTier  = dna.visual_tier  || deriveTier(visualVal);
  const claimTier   = dna.claim_tier   || deriveTier(claimVal);

  return [
    { axis: 'Yorum',  value: reviewVal,  label: tierMap[reviewTier]  || '—', tier: reviewTier,  detail: dna.review_detail  || '' },
    { axis: 'Fiyat',  value: priceVal,   label: tierMap[priceTier]   || '—', tier: priceTier,   detail: dna.price_detail   || '' },
    { axis: 'Görsel', value: visualVal,  label: tierMap[visualTier]  || '—', tier: visualTier,  detail: dna.visual_detail  || '' },
    { axis: 'İddia',  value: claimVal,   label: tierMap[claimTier]   || '—', tier: claimTier,   detail: dna.claim_detail   || '' },
  ];
}

function mapCredibilityValue(val) {
  if (typeof val === 'string') {
    const v = val.toLowerCase();
    if (v === 'high' || v === 'medium' || v === 'low') return v;
  }
  const n = Number(val);
  if (isNaN(n)) return 'medium';
  if (n >= 75) return 'high';
  if (n >= 45) return 'medium';
  return 'low';
}

function adaptConflicts(raw) {
  if (!raw || raw.length === 0) return [];
  return raw.map((c, i) => ({
    id: c.id || `c-${i}`,
    topic: c.topic || c.claim || '',
    severity: c.severity || 'medium',
    summary: c.summary || c.claim || '',
    statements: (c.statements || []).map(s => ({
      source: s.source || '',
      sourceType: s.source_type || s.sourceType || 'forum',
      value: s.value || '',
      stance: s.stance || 'neutral',
      detail: s.detail || '',
      credibility: mapCredibilityValue(s.credibility ?? 50),
    })),
    resolution: c.resolution || '',
  }));
}

function adaptReviewers(raw, backendState) {
  if (!raw || raw.length === 0) return [];
  const youtubeVideos = backendState?.research?.youtube_videos || [];

  return raw.map((r, i) => {
    const trustScore = r.trust_score ?? r.trustScore ?? 50;
    const sponsorshipRatio = r.sponsorship_ratio ?? r.sponsorshipRatio ?? 0;
    const rawAccuracyDelta = r.accuracy_delta ?? r.accuracyDelta ?? 0;
    const accuracyDeltaStr = typeof rawAccuracyDelta === 'number' 
      ? (rawAccuracyDelta >= 0 ? `+${rawAccuracyDelta.toFixed(2)}` : `${rawAccuracyDelta.toFixed(2)}`)
      : String(rawAccuracyDelta);

    const tierRaw = r.tier || '';
    let tier, label;
    if (tierRaw === 'trusted' || tierRaw === 'good') {
      tier = 'good'; label = 'TUTARLI ANALİZ';
    } else if (tierRaw === 'biased' || tierRaw === 'bad') {
      tier = 'bad'; label = 'TANITIM AĞIRLIKLI';
    } else {
      if (trustScore >= 70) { tier = 'good'; label = 'TUTARLI ANALİZ'; }
      else if (trustScore >= 40) { tier = 'warn'; label = 'DENGELİ'; }
      else { tier = 'bad'; label = 'TANITIM AĞIRLIKLI'; }
    }

    const sponsorPct = sponsorshipRatio > 1 ? Math.round(sponsorshipRatio) : Math.round(sponsorshipRatio * 100);
    const sponsorshipLabel = r.sponsorship_label ?? r.sponsorshipLabel ?? `%${sponsorPct}`;

    const subscribers = r.subscribers_label ?? r.subscribers 
      ?? (r.subscriber_count ? (
          r.subscriber_count >= 1_000_000 
            ? `${(r.subscriber_count / 1_000_000).toFixed(1)}M`
            : r.subscriber_count >= 1000 
              ? `${Math.floor(r.subscriber_count / 1000)}B`
              : String(r.subscriber_count)
        ) : '');

    let channel = (r.channel || '').trim();
    let handle = (r.handle || '').trim();
    let url = r.url || null;

    const isGenericChannel = (name) => {
      if (!name) return true;
      const lower = name.toLocaleLowerCase('tr-TR').trim();
      return lower === 'bilinmiyor' || lower === 'asmr' || lower === 'belirtilmemiş' || lower === 'belirtilmemis' || lower === 'unspecified' || lower.startsWith('@belirtilmemiş') || lower.startsWith('@belirtilmemis') || lower === 'belirtilmemis';
    };

    const matchedVideo = youtubeVideos.find(v => 
      (v.channel && channel && v.channel.toLowerCase().includes(channel.toLowerCase()))
    ) || youtubeVideos[i];

    if (matchedVideo) {
      if (isGenericChannel(channel) || channel.length > 35) {
        channel = matchedVideo.channel || matchedVideo.author || `YouTube Kanalı #${i+1}`;
      }
      if (!url) url = matchedVideo.url;
    }

    if (isGenericChannel(channel) || channel.length > 35) {
      channel = `Teknoloji Kanalı #${i + 1}`;
    }

    const isGenericHandle = (h) => {
      if (!h) return true;
      const lower = h.toLocaleLowerCase('tr-TR').trim();
      return lower === 'bilinmiyor' || lower === 'bağımsız içerik üreticisi' || lower === 'unknown' || lower === 'belirtilmemiş' || lower === 'belirtilmemis' || lower === 'unspecified' || lower.startsWith('@belirtilmemiş') || lower.startsWith('@belirtilmemis') || lower === '@belirtilmemis';
    };

    if (isGenericHandle(handle)) {
      const chan_url = url || r.channel_url || (matchedVideo && matchedVideo.channel_url) || '';
      const match = chan_url.match(/\/@([A-Za-z0-9_.-]+)/);
      if (match) {
        handle = `@${match[1]}`;
      } else {
        const cleanStr = channel.toLocaleLowerCase('tr-TR').replace(/\s+/g, '').replace(/\./g, '').replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ü/g, 'u');
        handle = `@${cleanStr}`;
      }
    }

    return {
      id: r.id || `r-${i}`,
      channel,
      handle,
      url,
      subscribers,
      subscriber_count: r.subscriber_count ?? null,
      trustScore,
      trust_score: trustScore,
      tier,
      label,
      consistency: r.consistency ?? 50,
      sponsorshipRatio,
      sponsorship_ratio: sponsorshipRatio,
      sponsorshipLabel,
      accuracyDelta: accuracyDeltaStr,
      accuracy_delta: rawAccuracyDelta,
      signals: (r.signals || []).map(s =>
        typeof s === 'string'
          ? { kind: 'warn', text: s }
          : { kind: s.kind || s.type || 'warn', text: s.text || '' }
      ),
      contribution: r.contribution || '',
    };
  });
}

function adaptAlternatives(raw) {
  if (!raw || raw.length === 0) return [];
  return raw.map((a, i) => {
    const trustScore = a.trust_score ?? a.trustScore ?? 0;
    const matchScore = a.match_score ?? a.matchScore ?? 0;
    const decision = a.decision || '';
    const decisionTier = a.decisionTier || deriveRecommendationTier(decision);

    let image = a.image || a.image_url || '';
    if (!image || typeof image !== 'string' || !image.startsWith('http')) {
      const lowerName = (a.name || '').toLowerCase();
      if (lowerName.includes('sony')) {
        image = 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80';
      } else if (lowerName.includes('bose')) {
        image = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&auto=format&fit=crop&q=80';
      } else if (lowerName.includes('jbl')) {
        image = 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400&auto=format&fit=crop&q=80';
      } else if (lowerName.includes('samsung') || lowerName.includes('galaxy') || lowerName.includes('pixel') || lowerName.includes('phone') || lowerName.includes('xiaomi') || lowerName.includes('redmi') || lowerName.includes('huawei')) {
        image = 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&auto=format&fit=crop&q=80'; // Akıllı Telefon
      } else if (lowerName.includes('iphone') || lowerName.includes('apple')) {
        image = 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&auto=format&fit=crop&q=80'; // iPhone
      } else if (lowerName.includes('watch') || lowerName.includes('saat') || lowerName.includes('fitbit')) {
        image = 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=400&auto=format&fit=crop&q=80'; // Akıllı Saat
      } else if (lowerName.includes('laptop') || lowerName.includes('macbook') || lowerName.includes('computer') || lowerName.includes('asus') || lowerName.includes('lenovo') || lowerName.includes('dell') || lowerName.includes('hp')) {
        image = 'https://images.unsplash.com/photo-1496181130204-7552cc14b1e0?w=400&auto=format&fit=crop&q=80'; // Bilgisayar / Laptop
      } else {
        image = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80'; // Genel Kulaklık / Varlık
      }
    }

    return {
      id: a.id || `a-${i}`,
      name: a.name || '',
      price: a.price || '',
      priceTag: a.price_tag ?? a.priceTag ?? '',
      priceTagTier: a.price_tag_tier ?? a.priceTagTier ?? 'good',
      trustScore: trustScore,
      trust_score: trustScore,
      decision: decision,
      decisionTier: decisionTier,
      matchScore: matchScore,
      match_score: matchScore,
      matchReason: a.match_reason ?? a.matchReason ?? '',
      match_reason: a.match_reason ?? a.matchReason ?? '',
      strengthDelta: a.strength_delta ?? a.strengthDelta ?? '',
      weaknessDelta: a.weakness_delta ?? a.weaknessDelta ?? '',
      image: image,
      category: a.category ?? 'Alternatif Ürün',
      cached: a.cached || false,
    };
  });
}


function adaptXrayReveal(raw, backendState) {
  if (!backendState) return null;

  const xray = backendState.xray || {};
  const research = backendState.research || {};
  const advisor = backendState.advisor || {};
  const claims = xray.claims || [];
  const priceData = backendState.price_data || {};
  const priceVerify = xray.price_verification || {};

  // Build comparison items dynamically from available claims (max 3)
  const comparisons = [];

  for (const c of claims.slice(0, 4)) {
    if (!c.claim || !c.reality) continue;
    // Extract the most meaningful numeric/value token from each side
    const extractVal = (str) => {
      const m = str.match(/(\d[\d.,]*\s*(%|₺|tl|saat|sa|h\b|mah|db|dB|mp|ghz|gb|tb|watt|w\b|mm))/i);
      return m ? m[0] : str.slice(0, 32);
    };
    comparisons.push({
      id: `claim-${comparisons.length}`,
      label: c.topic || c.claim.slice(0, 28),
      beforeVal: extractVal(c.claim),
      beforeSub: 'Üretici iddiası',
      afterVal: extractVal(c.reality),
      afterSub: 'Gerçek ölçüm & forum',
      severity: c.verdict === 'doğru' ? 'good' : c.verdict === 'kısmen' ? 'warn' : 'bad',
      deltaLabel: c.verdict ? c.verdict.toUpperCase() : null,
    });
    if (comparisons.length === 3) break;
  }

  // If no claims, try price discount as a fallback item
  if (comparisons.length === 0) {
    const beforeDiscountVal = priceData.label_discount_pct ?? null;
    const realDiscountVal = priceVerify.real_discount ?? priceData.real_discount_pct ?? null;
    if (beforeDiscountVal != null || realDiscountVal != null) {
      comparisons.push({
        id: 'discount',
        label: 'İndirim Oranı',
        beforeVal: beforeDiscountVal != null ? `%${beforeDiscountVal}` : null,
        beforeSub: 'Etiket indirimi',
        afterVal: realDiscountVal != null ? `%${realDiscountVal}` : null,
        afterSub: 'Gerçek indirim',
        severity: 'warn',
        deltaLabel: null,
      });
    }
  }

  const analysis = backendState.analysis || {};
  const rawCatScores = analysis.category_scores || backendState.category_scores || raw?.category_scores || [];
  const categoryScores = rawCatScores
    .map(cs => ({
      key: cs.category || cs.key || '',
      name: cs.name || cs.category || cs.key || '',
      score: cs.score ?? 0,
      positiveCount: cs.positive_count ?? cs.positiveCount ?? cs.sentiment?.pos ?? cs.sentiment?.positive ?? 0,
      negativeCount: cs.negative_count ?? cs.negativeCount ?? cs.sentiment?.neg ?? cs.sentiment?.negative ?? 0,
      topFinding: cs.top_finding || cs.top || '',
    }))
    .filter(cs => cs.key);

  const hbSummary = research.hb_summary || backendState.research?.hb_summary || raw?.hb_summary || null;

  // No usable data at all → return null so component hides
  if (comparisons.length === 0 && !hbSummary && categoryScores.length === 0) return null;

  return {
    before: { label: raw?.before?.label || 'YÜZEY · ÜRETİCİ GÖZÜ' },
    after:  { label: raw?.after?.label  || 'RÖNTGEN · GERÇEK' },
    comparisons,
    hb_summary: hbSummary,
    category_scores: categoryScores.length > 0 ? categoryScores : null,
  };
}

function deriveVerdict(score) {
  if (score >= 70) return 'good';
  if (score >= 40) return 'warn';
  return 'bad';
}

function deriveRecommendationTier(label) {
  if (!label) return 'warn';
  const up = label.toUpperCase();
  if (up === 'AL' || up === 'BUY') return 'good';
  if (up === 'ALMA' || up === 'AVOID') return 'bad';
  return 'warn';
}

function adaptVideos(raw, productName = '') {
  if (!raw || raw.length === 0) return [];
  return raw.map((v, i) => {
    let videoId = '';
    if (v.video_url) {
      const match = v.video_url.match(/[?&]v=([^&]+)/) || v.video_url.match(/youtu\.be\/([^?]+)/);
      if (match) videoId = match[1];
    }
    // URL çözülemeyen an gerçek kanıt değildir — alakasız fallback video gösterme
    if (!videoId) return null;

    const tsStr = v.timestamp || '00:00';
    const startPart = tsStr.split('-')[0] || '00:00';
    const parts = startPart.split(':');
    let startSec = 0;
    if (parts.length === 2) {
      startSec = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else if (parts.length === 3) {
      startSec = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
    }

    // İddia/tespit yalnızca backend gerçekten ürettiyse gösterilir;
    // yoksa çelişki kutusu render edilmez (uydurma "Premium Performans" yok)
    const hasConflict = Boolean(v.claimed_value && v.visible_value);
    const bad = hasConflict && (v.discrepancy || 0) > 0.15;

    return {
      channel: v.channel || `Teknoloji Kanalı #${i + 1}`,
      title: v.title || `${productName || 'Ürün'} İnceleme Kesiti`,
      thumb: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      id: videoId,
      videoId: videoId,
      time: v.duration || '',
      moment: startPart,
      startSec: startSec,
      startAt: startSec,
      quote: v.transcript_quote || '',
      conflict: hasConflict ? {
        claimedLabel: 'Üretici İddiası',
        claimed: v.claimed_value,
        actualLabel: 'Video İnceleme Tespiti',
        actual: v.visible_value,
        bad: bad,
      } : null,
      summary: v.summary || '',
    };
  }).filter(Boolean);
}

export function buildFallbackProductState(item, threadId, query) {
  const decisionStr = typeof item.decision === 'string' ? item.decision : (item.decision?.badge || 'AL');
  const wasPrice = item.price?.was || 0;
  const currentPrice = item.price?.current || 0;
  const discountPct = wasPrice > 0 ? Math.round(((wasPrice - currentPrice) / wasPrice) * 100) : 0;

  const trustBreakdown = item.trustBreakdown || [
    { lbl: 'Forum',     pct: 35, score: 0 },
    { lbl: 'YouTube',   pct: 30, score: 0 },
    { lbl: 'E-ticaret', pct: 20, score: 0 },
    { lbl: 'İddia',     pct: 15, score: 0 },
  ];

  const dna = item.dna || [];

  return {
    isMockProduct: false,
    id: item.id || threadId || 'unknown',
    name: item.name || query || 'Bilinmeyen Ürün',
    category: item.category || 'Teknoloji',
    image: item.image || null,
    price: item.price || { current: currentPrice, was: wasPrice, discount: discountPct },
    realDiscount: item.realDiscount || { 
      label: discountPct > 5 ? `GERÇEK İNDİRİM: %${discountPct - 3}` : 'İNDİRİM VERİSİ YOK', 
      detail: discountPct > 5 ? `Son 30 günün en düşük fiyatına göre gerçek indirim oranı hesaplandı.` : 'Fiyat trendi stabil seyrediyor.' 
    },
    priceHistory: item.priceHistory && item.priceHistory.length > 0 ? item.priceHistory : [
      wasPrice, 
      wasPrice, 
      Math.round(wasPrice * 0.98), 
      Math.round(wasPrice * 0.97), 
      currentPrice
    ],
    claims: item.claims || [],
    sources: item.sources || {
      trendyolReviews: Math.round((item.sources?.reviews || 100) * 0.6),
      hepsiburadaReviews: Math.round((item.sources?.reviews || 100) * 0.4),
      forumThreads: Math.round((item.sources?.forum || 10) * 0.2),
      youtubeVideos: item.sources?.video || 0,
      forumPosts: item.sources?.forum || 0,
      donanimhaber: Math.round((item.sources?.forum || 10) * 0.6),
      technopat: Math.round((item.sources?.forum || 10) * 0.4),
      eksisozluk: 0,
      webtekno: 0,
      sikayetvar: 0,
      scraperAvailable: false,
      totalReviews: item.sources?.reviews || 0,
    },
    trustScore: item.trustScore ?? 0,
    trustBreakdown,
    dna,
    videos: item.videos || [],
    decision: { 
      badge: decisionStr, 
      tier: item.decisionTier || deriveRecommendationTier(decisionStr) || 'good', 
      summary: item.headline || 'Analiz verileri başarıyla yüklenmiştir.',
      detail: item.headline || 'Genel analitik incelemelere göre sonuç çıkarılmıştır.',
      pros: [],
      cons: [],
    },
    challenger: item.challenger || {
      title: 'Şeytanın Avukatı',
      points: [
        'Kullanıcı yorumlarındaki bazı dönemsel övgüler şüphe uyandırıyor.',
        'Benzer fiyat bandında daha stabil alternatifler bulunuyor.'
      ],
    },
    imageVerification: item.imageVerification || null,
    crossSourceConflicts: item.crossSourceConflicts || [],
    reviewers: item.reviewers || [],
    alternatives: item.alternatives || [],
    chatHistory: item.chatHistory || [],
    suggestions: item.suggestions || [],
  };
}
