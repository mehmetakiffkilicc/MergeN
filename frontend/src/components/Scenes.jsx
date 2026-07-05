import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BrandMark, TrustGauge, DNARadar, MiniGauge, Sparkline,
  AgentGraph, AgentStrip, ComparisonRadar, ProductClaims,
  SourceConsensus
} from './Widgets';
import {
  MOCK_PRODUCT, MOCK_PRODUCT_ASUS, PHASES, PRIORITY_LABELS, DEVICE_LABELS,
  BUDGET_LABELS, deriveDecision, RIVAL_PRODUCT,
  COMPARISON_CATEGORIES, COMPARISON_PROFILES, CATEGORY_SCORES,
  STRENGTHS, WEAKNESSES,
  CROSS_SOURCE_CONFLICTS, REVIEWERS, ALTERNATIVES, XRAY_REVEAL, XRAY_REVEAL_ASUS,
} from '../lib/mockData';
import { streamAnalysis, sendChat, getAnalysisResult, getAnalysisSummary } from '../lib/api';
import { adaptProductState } from '../lib/adapters';

/* ─── HOTSPOT IMAGE ─────────────────────────────────────── */
// Renders an image with objectFit:contain and positions hotspot
// dots correctly relative to the ACTUAL rendered image bounds.
function HotspotImage({ src, alt, hotspots, scanState, activeHotspot, setActiveHotspot, isReal, scannerClass, overlayLabel, style }) {
  const containerRef = useRef(null);
  const imgRef       = useRef(null);
  const [bounds, setBounds] = useState(null);

  const recompute = useCallback(() => {
    const el  = containerRef.current;
    const img = imgRef.current;
    if (!el || !img || !img.naturalWidth) return;
    const W  = el.clientWidth;
    const H  = el.clientHeight;
    const nW = img.naturalWidth;
    const nH = img.naturalHeight;
    const imgA = nW / nH;
    const conA = W  / H;
    let iW, iH, iX, iY;
    // object-fit: contain — görüntü GENİŞSE genişlik, UZUNSA yükseklik dolar
    if (imgA > conA) { iW = W;  iH = W / imgA; iX = 0;          iY = (H - iH) / 2; }
    else             { iH = H;  iW = H * imgA; iX = (W - iW) / 2; iY = 0; }
    setBounds({ iX, iY, iW, iH, W, H });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [recompute]);

  const hotspotStyle = (x, y) => {
    if (!bounds) return { left: `${x}%`, top: `${y}%` };
    const { iX, iY, iW, iH, W, H } = bounds;
    return {
      left: `${((iX + (x / 100) * iW) / W) * 100}%`,
      top:  `${((iY + (y / 100) * iH) / H) * 100}%`,
    };
  };

  return (
    <div ref={containerRef} className={`imgver-img${isReal ? ' imgver-img-real' : ' imgver-img-studio'}`}
      style={{ position: 'relative', overflow: 'hidden', background: '#0d0f12', borderRadius: 8, border: '1px solid var(--line-soft)', ...style }}>
      {src ? (
        <>
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            onLoad={recompute}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', opacity: 0.97 }}
          />
        </>
      ) : (
        <>
          <div className={isReal ? 'imgver-img-stripes-rough' : 'imgver-img-stripes-soft'} />
          <div className="imgver-shape"><span>{isReal ? 'GERÇEK FOTOĞRAF YOK' : 'STUDIO RENDER YOK'}</span></div>
        </>
      )}

      {scanState === 'scanning' && <div className={`imgver-scanner-line${isReal ? ' real' : ''}`} />}
      {scanState === 'scanning' && (
        <div className={`imgver-scan-overlay${isReal ? ' real' : ''}`}>
          <div className="imgver-scan-radar" />
          <span>{overlayLabel}</span>
        </div>
      )}

      {scanState === 'completed' && hotspots
        .filter(h => isReal ? h.real : h.studio)
        .map(h => {
          const pos = isReal ? h.real : h.studio;
          const handleKeyDown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveHotspot(activeHotspot === h.id ? null : h.id);
            }
          };
          return (
            <div
              key={h.id}
              className={`imgver-hotspot ${activeHotspot === h.id ? 'active' : ''}`}
              data-extra={isReal && !h.studio}
              style={hotspotStyle(pos.x, pos.y)}
              onClick={() => setActiveHotspot(activeHotspot === h.id ? null : h.id)}
              onKeyDown={handleKeyDown}
              tabIndex={0}
              role="button"
              aria-label={`${h.label} — Nokta ${h.id}`}
              aria-pressed={activeHotspot === h.id}
              title={h.label}
            >
              {h.id}
            </div>
          );
        })
      }
    </div>
  );
}

/* ─── HERO ──────────────────────────────────────────────── */
export function Hero({ onStart, onLoadExample }) {
  const [q, setQ] = useState('');
  const examples = [
    'Apple AirPods Pro 2',
    'Sony WH-1000XM5',
    'iPhone 15 Pro Max',
    'Trendyol ürün linki',
  ];
  return (
    <section className="page fadeup">
      <div className="hero">
        <div className="hero-head">
          <div className="hero-eyebrow">
            <span className="pip pip-warn pip-glow" />
            DİJİTAL TİCARET RÖNTGENİ · MULTIMODAL · AGENTIC
          </div>
          <h1>
            Etiketin arkasına <span className="accent">röntgenle</span> bak.
          </h1>
          <p className="hero-sub">
            Binlerce yorum, fiyat geçmişi, ürün görselleri, YouTube videoları ve forum tartışmaları —
            hepsini tek seferde tarıyoruz. Sana sadece satıcının söylediklerini değil,
            gerçek kullanıcıların yaşadıklarını gösteriyoruz.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="search-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.5" y2="16.5" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ürün adı veya Trendyol / Hepsiburada linki…"
              onKeyDown={(e) => e.key === 'Enter' && q && onStart(q)}
            />
            <button className="btn btn-primary" onClick={() => onStart(q || 'Apple AirPods Pro 2')}>
              Röntgenden Geçir
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <div className="hero-examples">
            <span className="hero-examples-lbl">Örnek</span>
            {examples.map((e, i) => (
              <button key={e} className="chip" onClick={() => i === 0 ? onLoadExample() : onStart(e)}>
                {e}
                {i === 0 && <span className="pip pip-good pip-glow" style={{ marginLeft: 4 }} />}
              </button>
            ))}
          </div>
        </div>

        <div className="hero-agents">
          {['research', 'xray', 'analysis', 'advisor', 'challenger'].map((id, i) => {
            const labels = {
              research:   { t: 'Tulpar',    role: 'Araştırma',     d: 'Yorumlar, forumlar ve videolar toplanıyor.' },
              xray:       { t: 'Kam',       role: 'Röntgen',       d: 'Fiyat oyunları ve sahte iddialar aranıyor.' },
              analysis:   { t: 'Bilge',     role: 'Analiz',        d: 'Güçlü ve zayıf yönler değerlendiriliyor.' },
              advisor:    { t: 'Yargucu',   role: 'Karar',         d: 'Sana özel uyum skoru ve karar üretiliyor.' },
              challenger: { t: 'Erlik',     role: 'Karşı-Argüman', d: 'Karar sorgulanıyor, karşı senaryolar üretiliyor.' },
            }[id];
            return (
              <div key={id} className="hero-agent">
                <span className="hero-agent-n">NODE 0{i + 1}</span>
                <div className="hero-agent-t">{labels.t}</div>
                <div className="hero-agent-role">{labels.role}</div>
                <div className="hero-agent-d">{labels.d}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Scanner helpers ───────────────────────────────────── */
const PRODUCT_CATEGORIES = [
  { pattern: /airpods|earbuds|buds|kulaklık|headphone|wf-|wh-|qc\s|kulakl/i, code: 'AUD', label: 'KULAKLIK',    brand_hints: /apple|sony|bose|jbl|anker|samsung|xiaomi|sennheiser/i },
  { pattern: /iphone|galaxy|pixel|redmi|xiaomi|realme|oneplus|telefon|\bphone\b/i, code: 'MOB', label: 'TELEFON',    brand_hints: /apple|samsung|google|xiaomi|huawei|oneplus/i },
  { pattern: /macbook|laptop|notebook|dizüstü|thinkpad|\brog\b|zenbook|vivobook/i, code: 'PC',  label: 'BİLGİSAYAR', brand_hints: /apple|lenovo|asus|hp|dell|acer|msi/i },
  { pattern: /ipad|\btablet\b|\btab\b/i,          code: 'TAB', label: 'TABLET',      brand_hints: /apple|samsung|lenovo|huawei/i },
  { pattern: /watch|akıllı saat|galaxy watch|band|bileklik/i, code: 'WCH', label: 'AKILLI SAAT', brand_hints: /apple|samsung|garmin|huawei|xiaomi/i },
  { pattern: /\btv\b|televizyon|oled|qled|nanocell/i, code: 'DSP', label: 'TELEVİZYON',  brand_hints: /samsung|lg|sony|tcl|philips/i },
  { pattern: /kamera|camera|gopro|canon|nikon|fujifilm/i, code: 'CAM', label: 'KAMERA',      brand_hints: /sony|canon|nikon|gopro|fujifilm/i },
  { pattern: /klavye|mouse|\bffare\b|keyboard|gamepad|joystick/i, code: 'PRF', label: 'PERİFERİK',  brand_hints: /logitech|razer|asus|corsair|steelseries/i },
  { pattern: /monitor|ekran|\bdisplay\b/i,        code: 'MON', label: 'MONİTÖR',     brand_hints: /samsung|lg|asus|dell|aoc/i },
  { pattern: /süpürge|robot|vacuum|temizlik/i,    code: 'EV',  label: 'EV ALETİ',    brand_hints: /xiaomi|dyson|irobot|philips/i },
];
const BRAND_MAP = [
  [/apple/i, 'APPLE'],   [/samsung/i, 'SAMSUNG'], [/sony/i, 'SONY'],
  [/xiaomi|redmi|poco/i, 'XIAOMI'], [/google|pixel/i, 'GOOGLE'],
  [/huawei|honor/i, 'HUAWEI'], [/oneplus/i, 'ONEPLUS'], [/asus|rog/i, 'ASUS'],
  [/bose/i, 'BOSE'],     [/jbl/i, 'JBL'],     [/anker|soundcore/i, 'ANKER'],
  [/lg/i, 'LG'],         [/logitech/i, 'LOGITECH'], [/dyson/i, 'DYSON'],
  [/lenovo|thinkpad/i, 'LENOVO'], [/dell/i, 'DELL'],
];
function detectProduct(q = '') {
  const cat = PRODUCT_CATEGORIES.find(c => c.pattern.test(q)) || { code: 'ÜRN', label: 'ÜRÜN' };
  const brand = (BRAND_MAP.find(([re]) => re.test(q)) || [])[1] || null;
  return { code: cat.code, label: cat.label, brand };
}

/* ─── ANALYSIS (live) ───────────────────────────────────── */
export function Analysis({ query, phaseIdx, messages, counters, agentStates, tickerMsg }) {

  const currentPhase = PHASES[phaseIdx] || { name: '...', id: '...' };
  const phaseLabel = {
    research: 'Araştırma', xray: 'Röntgen', analysis: 'Analiz', advisor: 'Danışman', challenger: 'Şeytanın Avukatı'
  }[currentPhase.id] || currentPhase.name;

  const product = detectProduct(query);

  return (
    <section className="page fadeup">
      <div className="analysis-wrap" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 32, alignItems: 'start' }}>
        
        {/* SOL: RADAR + LANGGRAPH */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="scanner">
            <div className="scanner-bg" />
            <div className="scanner-corners"><span /></div>
            <div className="scanner-meta">
              <span>HEDEF</span>
              <span>{query.toUpperCase().slice(0, 22)}</span>
            </div>
            <div className="scanner-product">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 120, height: 120, border: '1px solid var(--accent)', borderRadius: '50%',
                  display: 'grid', placeItems: 'center', position: 'relative' }}>
                  {/* Outer dashed pulse ring */}
                  <div style={{ position: 'absolute', inset: -8, border: '1px dashed var(--accent)', borderRadius: '50%', opacity: 0.4 }} />
                  {/* Mid ring — scan progress arc */}
                  <div style={{ position: 'absolute', inset: -18, borderRadius: '50%', border: '1px solid transparent',
                    borderTopColor: 'var(--accent)', opacity: 0.6,
                    animation: 'spin 3s linear infinite' }} />
                  {/* Inner product circle */}
                  <div style={{ width: 78, height: 78, borderRadius: '50%', background: 'var(--bg)',
                    border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <span style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700,
                      letterSpacing: '0.05em', color: 'var(--accent)', lineHeight: 1 }}>
                      {product.code}
                    </span>
                    <span style={{ fontSize: 7, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em',
                      color: 'var(--fg-dim)', textAlign: 'center', lineHeight: 1.3 }}>
                      {product.label}
                    </span>
                    {product.brand && (
                      <span style={{ fontSize: 6.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
                        color: 'var(--accent)', opacity: 0.7, marginTop: 1 }}>
                        {product.brand}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.15em',
                  color: 'var(--accent)', opacity: 0.85 }}>
                  HEDEF KİLİTLENDİ
                </div>
              </div>
            </div>
            <div className="scanner-line" />
            <div className="scanner-meta-b">
              <span>SİNYAL {String(counters.signals).padStart(2, '0')}</span>
              <span>AŞAMA {phaseIdx + 1}/5</span>
            </div>
          </div>
          <AgentGraph states={agentStates} />
        </div>

        {/* SAĞ: PANEL VE STREAM BİLGİSİ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* HEADER PANEL */}
          <div className="panel" style={{ padding: '32px 40px', border: 'none', background: 'var(--bg-panel, #121316)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 44, margin: '0 0 12px',
              letterSpacing: '-0.02em', fontWeight: 600 }}>
              {phaseLabel} sürüyor...
            </h2>
            <p style={{ margin: 0, fontSize: 16, color: 'var(--fg-dim)', lineHeight: 1.55 }}>
              {currentPhase.id === 'research'   && 'Binlerce yorum, forum gönderisi ve YouTube incelemesi okunuyor.'}
              {currentPhase.id === 'xray'       && 'Fiyat geçmişi kontrol ediliyor, sahte iddialar ve görsel tutarsızlıklar aranıyor.'}
              {currentPhase.id === 'analysis'   && 'Güçlü ve zayıf yönler çıkarılıyor, ürün kategorilere göre puanlanıyor.'}
              {currentPhase.id === 'advisor'    && 'Kullanım alışkanlıklarına göre bu ürünün sana ne kadar uygun olduğu hesaplanıyor.'}
              {currentPhase.id === 'challenger' && 'Karar bir kez daha sorgulanıyor — atlanan bir risk var mı diye bakılıyor.'}
            </p>
          </div>

          {/* STATS STRIP */}
          <div className="panel" style={{ padding: '24px 40px', border: 'none', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, background: 'var(--bg-panel, #121316)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 10, color: 'var(--fg-mute)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 8 }}>YORUM</span>
              <span style={{ fontSize: 32, fontWeight: 500, color: 'var(--fg)', fontFamily: 'var(--font-display)' }}>{counters.reviews.toLocaleString('tr-TR')}</span>
              <span style={{ fontSize: 11, color: counters.reviews > 0 ? 'var(--good)' : 'var(--fg-dim)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
                {counters.reviews > 0 ? `${counters.reviews.toLocaleString('tr-TR')} yorum toplandı` : 'Toplanıyor...'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 10, color: 'var(--fg-mute)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 8 }}>FORUM POST</span>
              <span style={{ fontSize: 32, fontWeight: 500, color: 'var(--fg)', fontFamily: 'var(--font-display)' }}>{counters.forums}</span>
              <span style={{ fontSize: 11, color: counters.forums > 0 ? 'var(--good)' : 'var(--fg-dim)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
                {counters.forums > 0 ? `${counters.forums} thread toplandı` : 'Taranıyor...'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 10, color: 'var(--fg-mute)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 8 }}>VİDEO</span>
              <span style={{ fontSize: 32, fontWeight: 500, color: 'var(--fg)', fontFamily: 'var(--font-display)' }}>{counters.videos}</span>
              <span style={{ fontSize: 11, color: counters.videos > 0 ? 'var(--good)' : 'var(--fg-dim)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
                {counters.videos > 0 ? `${counters.videos} video bulundu` : 'Aranıyor...'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 10, color: 'var(--fg-mute)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 8 }}>SİNYAL</span>
              <span style={{ fontSize: 32, fontWeight: 500, color: 'var(--warn)', fontFamily: 'var(--font-display)' }}>{counters.signals}</span>
              <span style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>Manipülasyon vektörü</span>
            </div>
          </div>

          {/* PHASE TICKER */}
          <div className="panel" style={{ padding: '16px 40px', border: 'none', background: 'var(--bg-panel, #121316)' }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-mute)', letterSpacing: '0.1em', marginRight: 16 }}>▸ STREAM</span>
            <span style={{ fontSize: 14, color: 'var(--fg)', fontWeight: 500 }}>{tickerMsg}</span>
          </div>

          {/* SSE LOGS */}
          <div className="panel" style={{ padding: '32px 40px', border: 'none', background: 'var(--bg-panel, #121316)', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-mute)', letterSpacing: '0.1em' }}>OLAY AKIŞI (SSE)</span>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-mute)', letterSpacing: '0.1em' }}>CANLI</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
              {messages.slice(-10).map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, color: 'var(--fg-dim)' }}>
                  <span style={{ color: 'var(--fg-mute)', minWidth: 90 }}>[{m.phase.toUpperCase()}]</span>
                  <span>{m.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─── DASHBOARD ─────────────────────────────────────────── */
const DASH_TABS = [
  { id: 'trust',    name: 'TRUST',        icon: '●', count: 2, sub: 'Ağırlıklı güven + kaynaklar' },
  { id: 'manip',    name: 'KAYNAK ANALİZİ', icon: '◈', count: 2, sub: 'Çelişki · Reviewer' },
  { id: 'evidence', name: 'KANIT',        icon: '▸', count: 3, sub: 'Video · Görsel · Yorum' },
  { id: 'decision', name: 'KARAR',        icon: '✓', count: 5, sub: 'Rapor · Kategori · Alternatif' },
  { id: 'price',    name: 'FİYAT',        icon: '₺', count: 1, sub: 'Fiyat röntgeni' },
];

function getHotspotAnalysis(productName = '', isMock = false, iv = null) {
  // Canlı analizde backend'in ürettiği hotspot etiketleri + bulgular kullanılır;
  // hardcoded sözlük yalnızca mock/eski veri için devrededir.
  const liveHs = iv?.hotspots || [];
  if (!isMock && liveHs.length > 0 && liveHs.some(h => h && h.label)) {
    const findings = iv.findings || [];
    const out = {};
    liveHs.forEach((h, i) => {
      const f = findings[i] || null;
      const id = h.id ?? (i + 1);
      out[id] = {
        title: `Nokta ${id}: ${h.label || 'İnceleme Noktası'}`,
        verdict: f && f.pct != null ? `Uyum Oranı: %${f.pct}` : (iv.matchScore != null ? `Genel Uyum: %${iv.matchScore}` : 'AI Analizi'),
        desc: (f && f.note) || iv.verdict || 'Bu nokta, stüdyo görseli ile gerçek görüntü arasında yapay zeka tarafından karşılaştırıldı.',
      };
    });
    return out;
  }

  const nameLower = productName.toLowerCase();
  const isSony = nameLower.includes('sony') || nameLower.includes('wh-');
  const isLaptop = nameLower.includes('laptop') || nameLower.includes('asus') || nameLower.includes('tuf') || nameLower.includes('a15') || nameLower.includes('gaming') || nameLower.includes('pc') || nameLower.includes('macbook') || nameLower.includes('bilgisayar');

  if (isLaptop) {
    return {
      1: {
        title: "Nokta 1: Ekran Menteşeleri & Çerçeve Uyumu",
        verdict: "Uyum Oranı: %96 (Kritik Alan)",
        desc: "Yapay zeka analizörümüz, üreticinin stüdyo render'ı ile gerçek kutu açılışı fotoğrafındaki ekran menteşelerini milimetrik olarak eşleştirdi. Çerçeve kalınlığı ve menteşe esnemezliği stüdyo şeması ile mükemmel bir tutarlılık sergilemektedir."
      },
      2: {
        title: "Nokta 2: Klavye & Touchpad Alanı",
        verdict: "Uyum Oranı: %92",
        desc: "Tuş takımı dizilimi, Türkçe Q klavye entegrasyonu ve touchpad konumlandırması stüdyo şeması ile birebir örtüşüyor. RGB aydınlatma şiddeti ve homojenliği, kullanıcıların gerçek fotoğraflarında premium hissiyatı doğrular niteliktedir."
      },
      3: {
        title: "Nokta 3: Hava Tahliye Izgaraları & Isı Yönetimi",
        verdict: "Pozitif Fark / İşçilik Kalitesi: %94",
        desc: "Kasa altındaki ve yan taraflardaki petek tasarımlı hava tahliye ızgaralarının yerleşimi stüdyo şeması ile tamamen uyumludur. Fiziksel üründe herhangi bir çapak veya hizalama kusuru bulunmamaktadır."
      }
    };
  }

  if (isSony) {
    return {
      1: {
        title: "Nokta 1: Kafa Bandı & Sürgü Mekanizması Uyumu",
        verdict: "Uyum Oranı: %96 (Kritik Alan)",
        desc: "Yapay zeka analizörümüz, üreticinin stüdyo render'ı ile gerçek kutu açılışı fotoğrafındaki kafa bandı sürgüsünün metal-plastik birleşim çizgilerini milimetrik olarak eşleştirdi. Kaydırma hissi ve malzeme kalitesi stüdyo şeması ile mükemmel bir tutarlılık sergilemektedir."
      },
      2: {
        title: "Nokta 2: Kulak Yastıkları & Akustik Kumaş Izgarası",
        verdict: "Uyum Oranı: %92",
        desc: "Kulak yastığındaki suni deri dikiş yapısı ve iç kısımdaki mikrofon koruyucu akustik kumaş yerleşimi stüdyo şeması ile birebir örtüşüyor. Yumuşaklık ve esneklik, kullanıcıların gerçek fotoğraflarında premium hissiyatı doğrular niteliktedir."
      },
      3: {
        title: "Nokta 3: USB-C Şarj Girişi & Mikrofon Delikleri",
        verdict: "Pozitif Fark / İşçilik Kalitesi: %94",
        desc: "Kasa altındaki tip-C portu çerçeve kesimi ve hüzmeleme mikrofon deliklerinin yerleşimi stüdyo şeması ile tamamen uyumludur. Fiziksel üründe herhangi bir çapak veya hizalama kusuru bulunmamaktadır."
      }
    };
  }

  return {
    1: {
      title: "Nokta 1: Şarj Kutusu Kapağı & Menteşe Uyumu",
      verdict: "Uyum Oranı: %94 (Bant İçi)",
      desc: "Yapay zeka analizörümüz, üreticinin stüdyo render'ı ile gerçek kutu açılışı fotoğrafındaki menteşe konumunu ve kapak birleşim çizgilerini milimetrik olarak eşleştirdi. Tek fark, stüdyo render'ının pürüzsüzleştirilmiş ışık yansıması iken gerçek üründe metalik menteşenin daha doğal bir fırçalanmış çelik dokusuna sahip olmasıdır."
    },
    2: {
      title: "Nokta 2: Kulaklık Sap Boyu & Mikrofon Izgarası",
      verdict: "Uyum Oranı: %88",
      desc: "Kulaklık sapındaki basınca duyarlı algılayıcı şerit ve mikrofon deliklerinin yerleşimi stüdyo şeması ile birebir örtüşüyor. Izgaranın derinliği ve siyah ton yoğunluğu stüdyoda daha simetrik görünse de, fiziksel üründe de akustik performansı etkilemeyecek seviyede yüksek kaliteli bir işçilik mevcut."
    },
    3: {
      title: "Nokta 3: Ekstra XS Silikon Kulaklık Ucu",
      verdict: "Pozitif Fark / Kutu İçeriği: %91",
      desc: "Üretici pazarlama görsellerinde genellikle sadece 3 boyut (S, M, L) silikon kulaklık ucunu ön plana çıkarırken, gerçek kutu açılışında 4. set olarak XS boyutlu ekstra silikon adaptör de tespit edilmiştir. Bu, üretici lehine dürüst ve zenginleştirilmiş bir paket içeriği kanıtıdır."
    }
  };
}

const STANCE_ICON = { manufacturer: '🏭', ecommerce: '🛒', youtube: '▶', forum: '💬', missing: '—' };

export function Dashboard({ product, threadId, onOpenChat, onEditProfile, onCompare, profile }) {
  const p = product || MOCK_PRODUCT;
  const [activeTab, setActiveTab] = useState('trust');
  const [activeHotspot, setActiveHotspot] = useState(null);
  const [imgScanState, setImgScanState] = useState('idle');
  const [playingVideos, setPlayingVideos] = useState({});

  useEffect(() => {
    if (activeTab === 'evidence') {
      setImgScanState('scanning');
      const timer = setTimeout(() => {
        setImgScanState('completed');
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setImgScanState('idle');
      setActiveHotspot(null);
    }
  }, [activeTab]);

  const hasProfile = profile && (profile.device || profile._filled);
  // Canlı analizde karar HER ZAMAN backend'den gelir (advisor.recommendation +
  // personal_score); deriveDecision sabit mock sezgileriyle çalıştığından
  // yalnızca mock demo ürünlerinde profile göre türetme yapar.
  const computed = (hasProfile && p.isMockProduct) ? deriveDecision(profile, p.name) : null;
  const decisionBadge    = computed ? computed.badge    : p.decision.badge;
  const decisionTier     = computed ? computed.tier     : p.decision.tier;
  const decisionScore    = computed ? computed.score    : (p.decision.score ?? 82);
  const decisionSummary  = computed ? computed.summary  : p.decision.summary;
  const challengerPoints = (computed && computed.challengerPoints?.length > 0) ? computed.challengerPoints : (p.challenger?.points || []);

  const profileTags = hasProfile ? [
    ...(computed ? [computed.deviceLabel, ...computed.priorityLabels, computed.budgetLabel] : []),
    ...(!computed || (!computed.deviceLabel && !computed.priorityLabels.length && !computed.budgetLabel)
      ? Object.values(profile._dynamicAnswerLabels || {})
      : [])
  ].filter(Boolean) : null;

  const tierColor = (t) => t === 'good' ? 'var(--good)' : t === 'bad' ? 'var(--bad)' : 'var(--warn)';

  const isMock = !!p.isMockProduct;
  const isAsus = p.id === 'asus-tuf-a15' || p.name?.toLowerCase().includes('asus') || p.name?.toLowerCase().includes('a15');

  const conflicts = p.crossSourceConflicts ?? (isMock ? (isAsus ? (MOCK_PRODUCT_ASUS.crossSourceConflicts || []) : (MOCK_PRODUCT.crossSourceConflicts || CROSS_SOURCE_CONFLICTS)) : []) ?? [];
  const reviewers = p.reviewers ?? (isMock ? (isAsus ? (MOCK_PRODUCT_ASUS.reviewers || []) : (MOCK_PRODUCT.reviewers || REVIEWERS)) : []) ?? [];
  const alternatives = p.alternatives ?? (isMock ? (isAsus ? (MOCK_PRODUCT_ASUS.alternatives || []) : (MOCK_PRODUCT.alternatives || ALTERNATIVES)) : []) ?? [];

  const xrayReveal = p.xrayReveal ?? (isMock ? (isAsus ? XRAY_REVEAL_ASUS : XRAY_REVEAL) : null);

  return (
    <section className="page fadeup">
      <div style={{ maxWidth: 1400, margin: '0 auto', position: 'relative' }}>
        <span className="file-stamp">Dosya · {p.id.slice(0, 4)} · 2026.05</span>

        <div className="product-head">
          <div className="product-img" style={{ overflow: 'hidden', position: 'relative' }}>
            {p.image ? (
              <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
            ) : (
              <>
                <div className="product-img-stripes" />
                <span>GÖRSEL YOK</span>
              </>
            )}
          </div>
          <div className="product-meta">
            <span className="product-cat">{p.category}</span>
            <h2 className="product-name">{p.name}</h2>
            <div className="product-sources">
              <span className="product-source"><span className="pip pip-good" />Trendyol <span className="k-num">{p.sources.trendyolReviews}</span></span>
              <span className="product-source"><span className="pip pip-good" />Hepsiburada <span className="k-num">{p.sources.hepsiburadaReviews}</span></span>
              <span className="product-source"><span className="pip pip-good" />Forum <span className="k-num">{p.sources.forumPosts}</span></span>
              <span className="product-source"><span className="pip pip-good" />YouTube <span className="k-num">{p.sources.youtubeVideos}</span></span>
            </div>
          </div>
          <div className="product-actions">
            <button className="btn btn-ghost" onClick={onCompare}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 3v18M7 3v18M3 7h4M17 7h4M3 17h4M17 17h4"/></svg>
              {p.alternatives?.[0]?.name ? `${p.alternatives[0].name.split(' ').slice(0, 2).join(' ')} ile Karşılaştır` : 'AI Alternatifi ile Karşılaştır'}
            </button>

            <button className="btn btn-primary" onClick={onOpenChat}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Danışmanla Sohbet Et
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <AgentStrip states={{ research: 'done', xray: 'done', analysis: 'done', advisor: 'done', challenger: 'done' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-mute)', letterSpacing: '0.08em' }}>
            PIPELINE · COMPLETE · {p.trustScore} GÜVEN
          </span>
        </div>

        {hasProfile ? (
          <div className="profile-strip">
            <div className="profile-strip-l">
              <span className="profile-strip-lbl">PROFIL</span>
              <div className="profile-strip-tags">
                {profileTags.map((tag, i) => <span key={i} className="profile-strip-tag">{tag}</span>)}
              </div>
            </div>
            <button className="btn btn-ghost" onClick={onEditProfile}>Profili Değiştir</button>
          </div>
        ) : (
          <div className="profile-strip" style={{ borderStyle: 'dashed' }}>
            <div className="profile-strip-l">
              <span className="profile-strip-lbl">PROFIL YOK</span>
              <span style={{ fontSize: 12, color: 'var(--fg-dim)' }}>Karar profilinle çok daha doğru olur.</span>
            </div>
            <button className="btn btn-primary" onClick={onEditProfile}>Profilimi Ekle</button>
          </div>
        )}

        {/* XrayReveal kaldırıldı */ }
        {p.claims && p.claims.length > 0 && <ProductClaims claims={p.claims} />}

        {/* Consolidated Source Averages — tüm kaynakların ortalama değerleri */}
        <SourceConsensus data={xrayReveal} productName={p.name} />

        {/* Tab bar */}
        <div className="dash-tabs">
          {DASH_TABS.map((t) => (
            <button key={t.id} className={`dash-tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em' }}>
                <span className="dash-tab-bullet">{t.icon}</span>
                {t.name}
                <span className="dash-tab-count">{t.count}</span>
              </span>
              <span className="dash-tab-meta">{t.sub}</span>
            </button>
          ))}
        </div>

        {/* ── TRUST tab ── */}
        {activeTab === 'trust' && (
          <div className="dash">
            <div className="panel dash-2">
              <div className="panel-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>Güven Skoru · Ağırlıklı</h3>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-mute)', letterSpacing: '0.08em' }}>
                    Forum 35% · YT 30% · E-tic 20% · İddia 15%
                  </span>
                </div>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'rgba(0, 229, 255, 0.1)', color: 'var(--accent)', padding: '4px 10px', borderRadius: 4, border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                  ℹ️ HESAPLAMA METODOLOJİSİ
                </span>
              </div>
              <div className="trust-wrap">
                <TrustGauge value={p.trustScore} />
                <div className="trust-bar-list">
                  {p.trustBreakdown.map((b) => (
                    <div key={b.lbl} className="trust-bar">
                      <span className="trust-bar-lbl">{b.lbl}</span>
                      <div className="trust-bar-track"><div className="trust-bar-fill" style={{ width: `${b.score}%` }} /></div>
                      <span className="trust-bar-val">{b.score}</span>
                      <span style={{ fontSize: 10, color: 'var(--fg-mute)', minWidth: 26 }}>%{b.pct}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* HESAPLAMA METODOLOJİSİ DETAYLI BİLGİLENDİRME KUTUSU */}
              <div style={{ marginTop: 24, padding: '20px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontSize: 13, fontWeight: 600, marginBottom: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  GÜVEN SKORU NEYE GÖRE HESAPLANIYOR?
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--fg-dim)', margin: '0 0 14px 0' }}>
                  Güven Skoru (Trust Score), ürün hakkındaki farklı bilgi kaynaklarının manipülasyon riskine, tarafsızlığına ve veri hacmine göre dinamik olarak ağırlıklandırılmasıyla hesaplanır. Başlangıçta e-ticaret (Hepsiburada) verileri baz alınır ve diğer bağımsız kaynaklar eklendikçe harmanlanarak nihai güven endeksi (0-100) oluşturulur:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: 'var(--fg)', fontWeight: 500, fontSize: 13 }}>💬 Forumlar (%35)</span>
                    <span style={{ fontSize: 12, color: 'var(--fg-mute)', lineHeight: 1.4 }}>DonanımHaber, Technopat gibi platformlardaki organik kullanıcı deneyimleri ve uzun vadeli kullanım raporları.</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: 'var(--fg)', fontWeight: 500, fontSize: 13 }}>▶ YouTube (%30)</span>
                    <span style={{ fontSize: 12, color: 'var(--fg-mute)', lineHeight: 1.4 }}>Bağımsız inceleme kanallarının profesyonel test, söküm ve akustik/donanım ölçüm sonuçları.</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: 'var(--fg)', fontWeight: 500, fontSize: 13 }}>🛒 E-Ticaret (%20)</span>
                    <span style={{ fontSize: 12, color: 'var(--fg-mute)', lineHeight: 1.4 }}>Hepsiburada ve Trendyol üzerindeki doğrulanmış alıcı yorumları, puan ortalamaları ve iade oranları.</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: 'var(--fg)', fontWeight: 500, fontSize: 13 }}>🏭 İddia (%15)</span>
                    <span style={{ fontSize: 12, color: 'var(--fg-mute)', lineHeight: 1.4 }}>Markanın resmi teknik verileri, lansman iddiaları ve pazarlama beyanlarının doğruluk payı.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-h"><h3>Hızlı Karar</h3></div>
              <div className="decision-badge" style={{ borderColor: tierColor(decisionTier) }}>
                <span className="decision-badge-tag">SONUÇ · {decisionTier === 'good' ? 'NET' : decisionTier === 'bad' ? 'OLUMSUZ' : 'KOŞULLU'}</span>
                <div className="decision-badge-t" style={{ color: tierColor(decisionTier) }}>{decisionBadge}</div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--fg-dim)' }}>
                  Kişisel uyum <span className="k-num" style={{ color: 'var(--fg)' }}>{decisionScore}/100</span>
                  {hasProfile ? ' · profile göre' : ' · genel profil'}
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-h"><h3>Kaynak Dağılımı</h3></div>
              <div className="src-list">
                {(() => {
                  const scraperRan = p.sources?.scraperAvailable;
                  const ecommerceSources = [
                    { lbl: 'Trendyol',    n: p.sources?.trendyolReviews || 0,    max: 1000 },
                    { lbl: 'Hepsiburada', n: p.sources?.hepsiburadaReviews || 0, max: 1000 },
                  ];
                  // Dinamik kırılım: gerçek platform sayıları (shiftdelete,
                  // donanimarsivi vb. dahil); veri yoksa eski sabit liste
                  const forumSources = (p.sources?.forumBreakdown?.length
                    ? p.sources.forumBreakdown.map(f => ({ lbl: f.label, n: f.count, max: 200 }))
                    : [
                        { lbl: 'DonanımHaber', n: p.sources?.donanimhaber || 0,  max: 200 },
                        { lbl: 'Technopat',    n: p.sources?.technopat || 0,     max: 200 },
                        { lbl: 'EkşiSözlük',  n: p.sources?.eksisozluk || 0,    max: 200 },
                        { lbl: 'Webtekno',     n: p.sources?.webtekno || 0,      max: 200 },
                        { lbl: 'Şikayetvar',   n: p.sources?.sikayetvar || 0,    max: 200 },
                      ]);
                  const videoSources = [
                    { lbl: 'YouTube', n: p.sources?.youtubeVideos || 0, max: 10 },
                  ];
                  const allSources = [...ecommerceSources, ...forumSources, ...videoSources];
                  return allSources.map((s) => {
                    const tier = s.n > 0 ? 'good' : scraperRan ? 'warn' : 'idle';
                    return (
                      <div key={s.lbl} className="src-row">
                        <span className={`pip pip-${tier}`} />
                        <span className="src-row-name">{s.lbl}</span>
                        <div className="src-row-bar">
                          <span style={{ width: `${Math.min(100, (s.n / s.max) * 100)}%` }} />
                        </div>
                        <span className="src-row-n">{scraperRan || s.n > 0 ? s.n : '—'}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── KAYNAK ANALİZİ tab ── */}
        {activeTab === 'manip' && (
          <div className="dash">
            <div className="panel dash-full">
              <div className="panel-h"><h3>Çapraz Kaynak Çelişkileri</h3></div>
              <div className="xsrc-list">
                {conflicts.length === 0 && <p style={{ color: 'var(--fg-mute)', fontSize: 13, padding: '12px 0' }}>Bu ürün için yeterli çapraz kaynak verisi toplanamadı.</p>}
                {conflicts.map((c) => (
                  <div key={c.id} className="xsrc-item">
                    <div className="xsrc-item-h">
                      <span className={`xsrc-item-tag ${c.severity}`}>{c.severity.toUpperCase()}</span>
                      <span className="xsrc-item-topic">{c.topic}</span>
                    </div>
                    <div className="xsrc-item-summary">{c.summary}</div>
                    <div className="xsrc-statements">
                      {c.statements.map((s, i) => (
                        <div key={i} className="xsrc-statement">
                          <div className="xsrc-statement-src">
                            <div className="xsrc-statement-src-icon">{STANCE_ICON[s.sourceType] || '·'}</div>
                            <span className="xsrc-statement-src-name">{s.source}</span>
                          </div>
                          <div>
                            <div className="xsrc-statement-val">{s.value}</div>
                            <div className="xsrc-statement-detail">{s.detail}</div>
                          </div>
                          <div className="xsrc-statement-cred">
                            <div className={`xsrc-cred-bars ${s.credibility}`}>
                              <span /><span /><span />
                            </div>
                            <span className="xsrc-cred-lbl">{s.credibility.toUpperCase()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {c.resolution && (
                      <div className="xsrc-resolution">
                        <span className="xsrc-resolution-lbl">SONUÇ</span>
                        <span className="xsrc-resolution-txt" dangerouslySetInnerHTML={{ __html: c.resolution.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="panel dash-full">
              <div className="panel-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>İçerik Üreticisi Güvenilirliği · YouTube</h3>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-mute)', letterSpacing: '0.05em' }}>
                    Sponsorlu İçerik Oranı · Tutarlılık Endeksi · Doğruluk Sapması
                  </span>
                </div>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'rgba(0, 229, 255, 0.1)', color: 'var(--accent)', padding: '4px 10px', borderRadius: 4, border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                  ℹ️ ANALİZ METODOLOJİSİ
                </span>
              </div>

              {/* YOUTUBE İÇERİK ÜRETİCİSİ ANALİZ METODOLOJİSİ BİLGİ KUTUSU */}
              <div style={{ marginBottom: 28, padding: '20px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontSize: 13, fontWeight: 600, marginBottom: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  YOUTUBE İNCELEMELERİ NEYE GÖRE DEĞERLENDİRİLİYOR?
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--fg-dim)', margin: '0 0 14px 0' }}>
                  Sistem, YouTube üzerindeki ürün inceleme videolarının transkriptlerini, başlık yapılarını ve kanal geçmişlerini tarayarak yapay zeka destekli bir güvenilirlik filtresi uygular. Her içerik üreticisi 3 temel metriğe göre puanlanır:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: 'var(--fg)', fontWeight: 500, fontSize: 13 }}>⚖️ Tutarlılık Endeksi</span>
                    <span style={{ fontSize: 12, color: 'var(--fg-mute)', lineHeight: 1.4 }}>Kanalın videodaki sözlü iddiaları ile ekranda gösterilen fiziki test sonuçları veya teknik veriler arasındaki uyum oranı.</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: 'var(--fg)', fontWeight: 500, fontSize: 13 }}>📢 Sponsorlu İçerik Oranı</span>
                    <span style={{ fontSize: 12, color: 'var(--fg-mute)', lineHeight: 1.4 }}>Kanalın genel yayın akışında ve incelenen videoda yer alan gizli/açık reklam, işbirliği ve yönlendirme bağlantılarının yoğunluğu.</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ color: 'var(--fg)', fontWeight: 500, fontSize: 13 }}>🎯 Doğruluk Sapması (Delta)</span>
                    <span style={{ fontSize: 12, color: 'var(--fg-mute)', lineHeight: 1.4 }}>Kanalın geçmişteki incelemelerinde öne sürdüğü yargıların, bağımsız laboratuvar ve uzun vadeli kullanıcı testleriyle örtüşme derecesi.</span>
                  </div>
                </div>
              </div>

              <div className="rvw-grid">
                {reviewers.length === 0 && <p style={{ color: 'var(--fg-mute)', fontSize: 13, padding: '12px 0' }}>Bu ürün için YouTube yorumcu analizi henüz toplanamadı.</p>}
                {reviewers.map((r, i) => (
                  <div key={i} className="rvw-card">
                    <div className="rvw-card-h">
                      <div>
                        <div className="rvw-card-channel">
                          {r.url ? (
                            <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.2)' }}>
                              {r.channel}
                            </a>
                          ) : (
                            r.channel
                          )}
                        </div>
                        <div className="rvw-card-handle">
                            {[r.handle, r.subscribers].filter(Boolean).join(' · ') || 'Bağımsız İçerik Üreticisi'}
                          </div>
                      </div>
                      <span className={`rvw-card-tag ${r.tier}`}>{r.label || (r.tier === 'trusted' || r.tier === 'good' ? 'GÜVENİLİR' : 'ŞÜPHELİ')}</span>
                    </div>
                    <div className="rvw-score">
                      <span className="rvw-score-n" style={{ color: (r.tier === 'good' || r.tier === 'trusted') ? 'var(--good)' : r.tier === 'bad' ? 'var(--bad)' : 'var(--warn)' }}>{r.trustScore}</span>
                      <span className="rvw-score-of">/ 100</span>
                      <span className="rvw-score-delta" style={{ color: String(r.accuracyDelta || '').startsWith('+') ? 'var(--good)' : 'var(--bad)' }}>{r.accuracyDelta}</span>
                    </div>
                    <div className="rvw-metric">
                      <span className="rvw-metric-lbl">TUTARLILIK</span>
                      <div className="rvw-metric-bar"><div className="rvw-metric-bar-fill" style={{ width: `${r.consistency}%` }} /></div>
                      <span className="rvw-metric-v">{r.consistency}</span>
                    </div>
                    <div className="rvw-meta">
                      <span className="rvw-meta-l">SPONSORLU ORAN</span>
                      <span className="rvw-meta-v">{r.sponsorshipLabel || `${r.sponsorshipRatio || 0}%`}</span>
                    </div>
                    <div className="rvw-signals">
                      {(r.signals || []).map((s, j) => (
                        <div key={j} className={`rvw-signal ${s.kind}`}>
                          <span className="rvw-signal-icon">{s.kind === 'good' ? '✓' : s.kind === 'bad' ? '✗' : '!'}</span>
                          {s.text}
                        </div>
                      ))}
                    </div>
                    <div className="rvw-contrib" dangerouslySetInnerHTML={{ __html: r.contribution.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── KANIT tab ── */}
        {activeTab === 'evidence' && (
          <div className="dash">
            <div className="panel dash-2">
              <div className="panel-h"><h3>Video İçgörüleri · Multimodal Vision</h3></div>
              <div className="video-row">
                {(!p.videos || p.videos.length === 0) && <p style={{ color: 'var(--fg-mute)', fontSize: 13, padding: '12px 0' }}>Bu ürün için video içgörüsü henüz toplanamadı.</p>}
                {(p.videos || []).map((v, i) => (
                  <div key={i} className="video-card">
                    <div className="video-thumb" style={{ position: 'relative', overflow: 'hidden', cursor: (v.videoId || v.id) ? 'pointer' : 'default' }} onClick={() => (v.videoId || v.id) && setPlayingVideos(prev => ({...prev, [i]: true}))}>
                      {playingVideos[i] && (v.videoId || v.id) ? (
                        <iframe style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} src={`https://www.youtube.com/embed/${v.videoId || v.id}?start=${v.startAt ?? v.startSec ?? 0}&autoplay=1`} allow="autoplay; encrypted-media" allowFullScreen />
                      ) : (v.thumb && v.thumb.startsWith('http')) ? (
                        <>
                          <img src={v.thumb} alt="video thumb" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)' }} />
                          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', color: '#fff', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.3)', transition: 'background 0.2s', zIndex: 2 }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="8 5 19 12 8 19 8 5"/></svg>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="video-thumb-stripes" />
                          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/></svg>
                            <span>{v.thumb || 'Video'}</span>
                          </div>
                        </>
                      )}
                      {!playingVideos[i] && <span className="video-time" style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.8)', padding: '2px 6px', fontSize: 11, borderRadius: 4, fontFamily: 'var(--font-mono)', zIndex: 2 }}>{v.time}</span>}
                    </div>
                    <div className="video-body">
                      <span className="video-channel">
                        <span className={`pip pip-${v.conflict?.bad ? 'bad' : 'good'}`} />
                        {v.channel}
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: 3, padding: '1px 5px', color: 'var(--accent)', marginLeft: 6 }}>
                          ▶ {v.moment}
                        </span>
                        {(v.videoId || v.id) && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-mute)', marginLeft: 4 }}>· Tıkla: İzle</span>
                        )}
                      </span>
                      <div style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.4, fontWeight: 500, marginTop: 2 }}>{v.title}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--fg-dim)', lineHeight: 1.5 }}>{v.summary}</div>
                      {v.quote && (
                        <div style={{ fontSize: 11.5, color: 'var(--fg-mute)', fontStyle: 'italic', lineHeight: 1.45, borderLeft: '2px solid rgba(0,229,255,0.35)', paddingLeft: 8, marginTop: 2 }}>
                          "{v.quote}" <span style={{ fontFamily: 'var(--font-mono)', fontStyle: 'normal', fontSize: 10 }}>— videodan, {v.moment}</span>
                        </div>
                      )}
                      {v.conflict && (
                      <div className="video-conflict">
                        <div>
                          <div className="video-conflict-lbl">{v.conflict.claimedLabel}</div>
                          <div className="video-conflict-val">{v.conflict.claimed}</div>
                        </div>
                        <div>
                          <div className="video-conflict-lbl">{v.conflict.actualLabel}</div>
                          <div className={`video-conflict-val ${v.conflict.bad ? 'bad' : ''}`}>{v.conflict.actual}</div>
                        </div>
                      </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {p.imageVerification && (
            <div className="panel dash-full">
              <div className="panel-h" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3>Görsel Doğrulama · Stüdyo ↔ Gerçek</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 11, fontFamily: 'var(--font-mono)', padding: '4px 10px', borderRadius: '4px', background: imgScanState === 'scanning' ? 'rgba(255, 179, 0, 0.1)' : 'rgba(0, 229, 255, 0.1)', border: `1px solid ${imgScanState === 'scanning' ? 'rgba(255, 179, 0, 0.2)' : 'rgba(0, 229, 255, 0.2)'}` }}>
                  <span className="pulse-indicator" style={{ width: 8, height: 8, borderRadius: '50%', background: imgScanState === 'scanning' ? 'var(--warn)' : 'var(--accent)', display: 'inline-block', animation: 'pulse-dot 1.2s infinite' }} />
                  {imgScanState === 'scanning' ? (
                    <span style={{ color: 'var(--warn)' }}>🤖 CANLI YAPAY ZEKA GÖRSEL ANALİZİ YAPILIYOR...</span>
                  ) : (
                    <span style={{ color: 'var(--accent)' }}>🤖 ANALİZ TAMAMLANDI · TESPİT EDİLEN UYUMLULUK: %{p.imageVerification.matchScore ?? '—'}</span>
                  )}
                </div>
              </div>
              
              <div className="imgver-grid">
                {/* STUDIO CARD */}
                <div className="imgver-card">
                  <div className="imgver-card-h">
                    <span className="imgver-card-h-l">
                      <span className="pip pip-good" /> {typeof p.imageVerification.studio === 'object' ? p.imageVerification.studio?.lbl : 'Stüdyo Görseli'}
                    </span>
                    <span className="imgver-card-h-r">
                      {typeof p.imageVerification.studio === 'object' ? p.imageVerification.studio?.sub : ''}
                    </span>
                  </div>
                  <HotspotImage
                    src={typeof p.imageVerification.studio === 'object' ? p.imageVerification.studio?.img : p.imageVerification.studio}
                    alt="studio render"
                    hotspots={p.imageVerification.hotspots || []}
                    scanState={imgScanState}
                    activeHotspot={activeHotspot}
                    setActiveHotspot={setActiveHotspot}
                    isReal={false}
                    overlayLabel="🤖 PİKSEL MODEL TARAMASI..."
                  />
                </div>

                {/* REAL LIFE CARD */}
                <div className="imgver-card">
                  <div className="imgver-card-h">
                    <span className="imgver-card-h-l" style={{ color: 'var(--warn)' }}>
                      <span className="pip pip-warn" /> {typeof p.imageVerification.real === 'object' ? p.imageVerification.real?.lbl : 'Gerçek Görsel'}
                    </span>
                    <span className="imgver-card-h-r">
                      {typeof p.imageVerification.real === 'object' ? p.imageVerification.real?.sub : ''}
                    </span>
                  </div>
                  <HotspotImage
                    src={typeof p.imageVerification.real === 'object' ? p.imageVerification.real?.img : p.imageVerification.real}
                    alt="real photograph"
                    hotspots={p.imageVerification.hotspots || []}
                    scanState={imgScanState}
                    activeHotspot={activeHotspot}
                    setActiveHotspot={setActiveHotspot}
                    isReal={true}
                    overlayLabel="🤖 YOUTUBE KARE İNCELEMESİ..."
                  />
                </div>
              </div>
              
              <div className="imgver-summary">
                <div className="imgver-score-block">
                  <span className="imgver-score-lbl">GÖRSEL UYUM SKORU</span>
                  <span className="imgver-score-n" style={{ color: tierColor(p.imageVerification.matchTier) }}>
                    {(() => {
                      const findings = p.imageVerification.findings || [];
                      const pcts = findings.map(f => typeof f === 'object' && f.pct != null ? f.pct : null).filter(x => x !== null);
                      return pcts.length > 0
                        ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
                        : p.imageVerification.matchScore;
                    })()}<span style={{ fontSize: 22, color: 'var(--fg-mute)' }}> / 100</span>
                  </span>
                  <p className="imgver-verdict" dangerouslySetInnerHTML={{ __html: (p.imageVerification.verdict || '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
                <div className="imgver-findings">
                  {(p.imageVerification.findings || []).map((f, i) => (
                    <div key={i} className="imgver-finding">
                      <span className={`imgver-finding-icon ${f.tier === 'good' ? 'good' : 'warn'}`}>{typeof f === 'object' && f.tier === 'good' ? '✓' : '⚠'}</span>
                      <span className="imgver-finding-l">{typeof f === 'string' ? f : f.label}</span>
                      {typeof f === 'object' && f.pct && <span className="imgver-finding-pct">%{f.pct}</span>}
                      <span className="imgver-finding-note">{f.note}</span>
                    </div>
                  ))}
                </div>
                
                {/* AI Live Detection Report Box */}
                <div className="imgver-ai-report" style={{
                  gridColumn: '1 / -1',
                  marginTop: '16px',
                  padding: '16px',
                  borderRadius: 'var(--radius-sm)',
                  background: activeHotspot ? 'rgba(0, 229, 255, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                  border: activeHotspot ? '1px dashed rgba(0, 229, 255, 0.25)' : '1px dashed rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: activeHotspot ? 'var(--accent)' : 'transparent', filter: 'blur(60px)', opacity: 0.08, pointerEvents: 'none', transition: 'all 0.3s ease' }} />
                  
                  {(() => {
                    const hotspots = getHotspotAnalysis(p.name, isMock, p.imageVerification);
                    if (!hotspots) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--fg-mute)', fontSize: 12.5, padding: '4px 0' }}>
                          <span style={{ fontSize: 16 }}>🤖</span>
                          <span>Bu ürün için görsel analiz verisi henüz toplanamadı.</span>
                        </div>
                      );
                    }
                    return activeHotspot && hotspots[activeHotspot] ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
                            {hotspots[activeHotspot].title}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, background: 'rgba(0, 229, 255, 0.1)', border: '1px solid rgba(0, 229, 255, 0.15)', padding: '2px 8px', borderRadius: '4px', color: 'var(--accent)' }}>
                            {hotspots[activeHotspot].verdict}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--fg-dim)', margin: 0 }}>
                          {hotspots[activeHotspot].desc}
                        </p>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--fg-mute)', fontSize: 12.5, padding: '4px 0' }}>
                        <span style={{ fontSize: 16 }}>🤖</span>
                        <span>Detaylı mikroskopik yapay zeka analiz raporunu görüntülemek için yukarıdaki görseller üzerindeki radar noktalarından (1, 2 veya 3) birini seçin.</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            )}

          </div>
        )}

        {/* ── KARAR tab ── */}
        {activeTab === 'decision' && (
          <div className="dash">
            <div className="panel dash-full">
              <div className="panel-h"><h3>Karar Raporu + Karşı-Argüman</h3></div>
              <div className="decision-panel">
                <div className="decision-badge" style={{ position: 'sticky', top: 80, borderColor: tierColor(decisionTier) }}>
                  <span className="decision-badge-tag">{decisionTier === 'good' ? 'NET' : decisionTier === 'bad' ? 'OLUMSUZ' : 'KOŞULLU'} · YARGUCU</span>
                  <div className="decision-badge-t" style={{ color: tierColor(decisionTier) }}>{decisionBadge}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-mute)', letterSpacing: '0.08em' }}>UYUM SKORU</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em' }}>
                      {decisionScore} <span style={{ color: 'var(--fg-mute)', fontSize: 16 }}>/ 100</span>
                    </span>
                  </div>
                </div>
                <div className="decision-body">
                  <p dangerouslySetInnerHTML={{ __html: decisionSummary.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                  <div className="challenger">
                    <div className="challenger-lbl">Erlik · Karşı-Senaryolar</div>
                    <ul className="challenger-list">
                      {challengerPoints.map((x, i) => <li key={i}>{x}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </div>



            <div className="panel dash-full">
              <div className="panel-h"><h3>Güçlü / Zayıf Yönler</h3></div>
              <div className="swcols">
                <div className="swcol">
                  <div className="swcol-h pos">
                    <span className="swcol-h-marker">+</span>
                    <span className="swcol-h-l">Güçlü Yönler</span>
                  </div>
                  <div className="sw-grid">
                    {!p.strengths?.length && !isMock && <p style={{ color: 'var(--fg-mute)', fontSize: 13, padding: '12px 0' }}>Veri yok.</p>}
                    {(p.strengths?.length ? p.strengths : (isMock ? STRENGTHS : [])).map((s, i) => (
                      <div key={i} className="sw-card sw-card-good">
                        <div className="sw-card-h">
                          <span className="sw-card-title">{s.title}</span>
                          {s.count > 0 && <span className="sw-card-count">{s.count} bahis</span>}
                        </div>
                        {s.detail && <div className="sw-card-detail">{s.detail}</div>}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="swcol">
                  <div className="swcol-h neg">
                    <span className="swcol-h-marker">−</span>
                    <span className="swcol-h-l">Zayıf Yönler</span>
                  </div>
                  <div className="sw-grid">
                    {!p.weaknesses?.length && !isMock && <p style={{ color: 'var(--fg-mute)', fontSize: 13, padding: '12px 0' }}>Veri yok.</p>}
                    {(p.weaknesses?.length ? p.weaknesses : (isMock ? WEAKNESSES : [])).map((w, i) => (
                      <div key={i} className={`sw-card sw-card-bad${w.critical ? ' sw-card-critical' : ''}`}>
                        <div className="sw-card-h">
                          <span className="sw-card-title">{w.title}</span>
                          {w.count > 0 && <span className="sw-card-count">{w.count} bahis</span>}
                          {w.critical && <span className="sw-card-tag">KRİTİK</span>}
                        </div>
                        {w.detail && <div className="sw-card-detail">{w.detail}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="panel dash-full">
              <div className="panel-h"><h3>Alternatif Ürünler · Bilge Önerileri</h3></div>
              <div className="alt-grid">
                {alternatives.length === 0 && <p style={{ color: 'var(--fg-mute)', fontSize: 13, padding: '12px 0' }}>Bu ürün için alternatif ürün önerisi henüz toplanamadı.</p>}
                {alternatives.map((a) => (
                  <div key={a.id} className="alt-card">
                    <div className="alt-card-head">
                      <div className="alt-card-img" style={{ backgroundImage: `url(${a.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                      <div className="alt-card-title">
                        <div className="alt-card-cat">{a.category}</div>
                        <div className="alt-card-name">{a.name}</div>
                      </div>
                    </div>
                    <div className="alt-card-stats">
                      <div className="alt-card-stat">
                        <span className="alt-card-stat-l">GÜVEN</span>
                        <span className="alt-card-stat-v" style={{ color: a.trustScore >= 80 ? 'var(--good)' : a.trustScore >= 60 ? 'var(--warn)' : 'var(--bad)' }}>{a.trustScore}</span>
                        <span className="alt-card-stat-sub">/ 100</span>
                      </div>
                      <div className="alt-card-stat">
                        <span className="alt-card-stat-l">FİYAT</span>
                        <span className="alt-card-stat-v">{a.price?.toLocaleString('tr-TR')} ₺</span>
                        <span className="alt-card-stat-sub" style={{ color: a.priceTagTier === 'good' ? 'var(--good)' : 'var(--warn)' }}>{a.priceTag}</span>
                      </div>
                    </div>
                    <div className="alt-decision">
                      <span className={`alt-decision-badge ${a.decisionTier}`} style={{
                        background: a.decisionTier === 'good' ? 'oklch(from var(--good) l c h / 0.12)' : a.decisionTier === 'bad' ? 'oklch(from var(--bad) l c h / 0.12)' : 'oklch(from var(--warn) l c h / 0.12)',
                        color: a.decisionTier === 'good' ? 'var(--good)' : a.decisionTier === 'bad' ? 'var(--bad)' : 'var(--warn)',
                      }}>{a.decision}</span>
                      <span className="alt-decision-match">Uyum {a.matchScore}%</span>
                    </div>
                    <div className="alt-reason">{a.matchReason}</div>
                    <div className="alt-deltas">
                      {a.strengthDelta && <span className="alt-delta"><span className="alt-delta-icon" style={{ color: 'var(--good)' }}>+</span><span className="alt-delta-text">{a.strengthDelta}</span></span>}
                      {a.weaknessDelta && <span className="alt-delta"><span className="alt-delta-icon" style={{ color: 'var(--bad)' }}>−</span><span className="alt-delta-text">{a.weaknessDelta}</span></span>}
                    </div>
                    {a.cached !== undefined && (
                      <div className="alt-card-cache">
                        {a.cached ? '✓ Röntgenden geçti' : '· Röntgen yok'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── FİYAT tab ── */}
        {activeTab === 'price' && (
          <div className="dash">
            <div className="panel">
              <div className="panel-h"><h3>Fiyat Röntgeni</h3></div>
              <div className="price-row">
                <span className="price-now">{p.price.current.toLocaleString('tr-TR')} ₺</span>
                {p.price.was > p.price.current && (
                  <>
                    <span className="price-was">{p.price.was.toLocaleString('tr-TR')} ₺</span>
                    <span className="price-disc">−{p.price.discount}%</span>
                  </>
                )}
              </div>
              <div className="price-real">
                <span className="price-real-h">{p.realDiscount.label}</span>
                <span className="price-real-t">{p.realDiscount.detail}</span>
              </div>
              <div className="price-spark">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '11px', color: 'var(--fg-mute)', fontFamily: 'var(--font-mono)' }}>
                  <span>90 Gün Önce</span>
                  <span>Bugün</span>
                </div>
                <Sparkline data={p.priceHistory} />
                {p.priceHistory && p.priceHistory.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '10px', color: 'var(--fg-mute)', fontFamily: 'var(--font-mono)' }}>
                    <span>Min: {Math.min(...p.priceHistory.map(d => typeof d === 'object' ? d.price : d)).toLocaleString('tr-TR')} ₺</span>
                    <span>Max: {Math.max(...p.priceHistory.map(d => typeof d === 'object' ? d.price : d)).toLocaleString('tr-TR')} ₺</span>
                  </div>
                )}
              </div>

              {/* Fiyat Değişim Geçmişi Listesi */}
              <div className="price-history-section">
                <h4 className="price-history-title">Fiyat Değişim Geçmişi</h4>
                <div className="price-history-list">
                  {(() => {
                    if (!p.priceHistory || p.priceHistory.length === 0) {
                      return <p style={{ color: 'var(--fg-mute)', fontSize: '12px' }}>Fiyat geçmişi bulunamadı.</p>;
                    }

                    // Fiyat geçmişini normalize et
                    const normalized = p.priceHistory.map((d, i) => {
                      if (typeof d === 'object' && d !== null) {
                        return { price: d.price ?? d.value ?? 0, date: d.date ?? '' };
                      }
                      return { price: Number(d) || 0, date: '' };
                    });

                    // Sadece fiyatın değiştiği kırılımları filtrele
                    const changes = [];
                    let lastPrice = null;

                    for (let i = 0; i < normalized.length; i++) {
                      const item = normalized[i];
                      if (lastPrice === null) {
                        changes.push({ ...item, diffPct: null, type: 'init' });
                        lastPrice = item.price;
                      } else if (item.price !== lastPrice) {
                        const diff = item.price - lastPrice;
                        const diffPct = ((diff / lastPrice) * 100).toFixed(1);
                        changes.push({
                          ...item,
                          diffPct: diff > 0 ? `+${diffPct}%` : `${diffPct}%`,
                          type: diff > 0 ? 'up' : 'down'
                        });
                        lastPrice = item.price;
                      }
                    }

                    // En yeni değişim en üstte olsun
                    const displayChanges = changes.reverse();

                    if (displayChanges.length <= 1) {
                      return (
                        <div className="price-history-item">
                          <span className="price-history-date">Son 90 Gün</span>
                          <span className="price-history-val">{p.price.current.toLocaleString('tr-TR')} ₺</span>
                          <span className="price-history-change stable">Stabil</span>
                        </div>
                      );
                    }

                    return displayChanges.map((ch, idx) => (
                      <div key={idx} className="price-history-item">
                        <span className="price-history-date">{ch.date || `Gün ${normalized.length - idx}`}</span>
                        <span className="price-history-val">{ch.price.toLocaleString('tr-TR')} ₺</span>
                        {ch.type === 'init' ? (
                          <span className="price-history-change stable">Taban</span>
                        ) : (
                          <span className={`price-history-change ${ch.type}`}>
                            {ch.diffPct}
                          </span>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
}

/* ─── CHAT ──────────────────────────────────────────────── */
export function Chat({ product, threadId, onBack }) {
  const p = product || MOCK_PRODUCT;
  
  const initialMessages = (p.chatHistory && p.chatHistory.length > 0) ? p.chatHistory : [
    {
      from: 'bot',
      agent: 'MergeN Danışman',
      text: `Merhaba! Ben MergeN yapay zeka danışmanıyım. **${p.name}** hakkındaki röntgen analizimizi tamamladım.\n\n**Özet Kararım:** ${p.decision?.badge || 'VERİ YOK'}\n${p.decision?.detail || p.decision?.summary || 'Ürünle ilgili verileri topladım.'}\n\nBu ürünle ilgili merak ettiğin her şeyi (kronik sorunları, gerçek kullanıcı şikayetleri, teknik detayları vs.) bana sorabilirsin. Sana nasıl yardımcı olabilirim?`
    }
  ];

  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const streamRef = useRef(null);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [messages, typing]);

  const send = async (txt) => {
    if (!txt.trim()) return;
    setMessages((m) => [...m, { from: 'user', text: txt }]);
    setInput('');
    setTyping(true);
    
    try {
      const res = await sendChat({ message: txt, threadId: threadId || p.id, productName: p.name });
      setMessages((m) => [...m, {
        from: 'bot',
        agent: res.agent || 'Advisor',
        text: res.message || res.answer || '',
      }]);
    } catch (err) {
      console.error(err);
    } finally {
      setTyping(false);
    }
  };

  return (
    <section className="page fadeup">
      <div className="chat-wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-mute)', letterSpacing: '0.12em' }}>SOHBET · {p.name.toUpperCase()}</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, margin: 0, fontWeight: 500, letterSpacing: '-0.02em' }}>
              Danışmanla Sohbet
            </h2>
          </div>
          <button className="btn btn-ghost" onClick={onBack}>← Dashboard</button>
        </div>

        <div className="chat-stream" ref={streamRef}>
          {messages.map((m, i) => (
            <div key={i} className={`msg msg-${m.from}`}>
              <span className="msg-from">{m.from === 'user' ? 'Sen' : `Asistan · ${m.agent || 'Advisor'}`}</span>
              <div className="msg-bubble" dangerouslySetInnerHTML={{
                __html: m.text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
              }} />
            </div>
          ))}
          {typing && <div className="msg msg-bot"><span className="msg-from">Asistan · düşünüyor...</span></div>}
        </div>

        <div className="chat-input">
          <input
            placeholder="Bir şey sor..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
          />
          <button className="btn btn-primary" onClick={() => send(input)}>Gönder</button>
        </div>
      </div>
    </section>
  );
}

/* ─── PERSONALIZATION ──────────────────────────────────── */
export function Personalization({ initial, questions, threadId, onComplete, onSkip }) {
  const [device, setDevice]         = useState(initial?.device || null);
  const [priorities, setPriorities] = useState(initial?.priorities || []);
  const [budget, setBudget]         = useState(initial?.budget || null);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping]     = useState(false);
  const [dynamicAnswers, setDynamicAnswers] = useState({});
  const [dynamicAnswerLabels, setDynamicAnswerLabels] = useState({});

  const hasLiveQuestions = questions && questions.length > 0;

  const profile = { device, priorities, budget };
  const decision = deriveDecision(profile);
  const normalizedQs = hasLiveQuestions
    ? questions.map((q, i) => typeof q === 'string' ? { id: `q${i}`, question: q, options: [] } : q)
    : [];
  const canSubmit = hasLiveQuestions
    ? normalizedQs.every(q => dynamicAnswers[q.id || q.question]?.trim())
    : (device && priorities.length > 0 && budget);

  const togglePriority = (key) => {
    setPriorities((arr) => {
      if (arr.includes(key)) return arr.filter((x) => x !== key);
      if (arr.length >= 3) return arr;
      return [...arr, key];
    });
  };

  const submit = () => {
    setSubmitting(true);
    if (hasLiveQuestions) {
      const filledProfile = { ...profile, _filled: true, _dynamicAnswerLabels: dynamicAnswerLabels };
      onComplete(filledProfile, dynamicAnswers);
    } else {
      setTimeout(() => onComplete(profile, null), 700);
    }
  };

  const handleSkip = async () => {
    setSkipping(true);
    try {
      await onSkip();
    } catch (err) {
      console.error(err);
    } finally {
      setSkipping(false);
    }
  };

  if (hasLiveQuestions) {
    const normalizedQuestions = questions.map((q, i) =>
      typeof q === 'string' ? { id: `q${i}`, question: q, options: [] } : q
    );

    return (
      <section className="page fadeup">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div className="pers-head">
            <h1>Bir adım daha — sana özel karar için birkaç soru.</h1>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {normalizedQuestions.map((q) => {
              const qId = q.id || q.question;
              const opts = q.options || [];
              return (
                <div key={qId} className="pers-q">
                  <h3>{q.question}</h3>
                  <div className="pers-opts">
                    {opts.length > 0 ? opts.map((opt) => {
                      const optVal = typeof opt === 'string' ? opt : opt.value || opt.label;
                      const optLabel = typeof opt === 'string' ? opt : opt.label || opt.value;
                      return (
                        <button
                          key={optVal}
                          className="pers-opt"
                          data-on={dynamicAnswers[qId] === optVal}
                          onClick={() => { setDynamicAnswers(a => ({ ...a, [qId]: optVal })); setDynamicAnswerLabels(a => ({ ...a, [qId]: optLabel })); }}
                        >
                          {optLabel}
                        </button>
                      );
                    }) : (
                      <textarea
                        className="pers-textarea"
                        rows={3}
                        placeholder="Cevabınızı yazın..."
                        value={dynamicAnswers[qId] || ''}
                        onChange={e => setDynamicAnswers(a => ({ ...a, [qId]: e.target.value }))}
                      />
                    )}
                  </div>
                </div>
              );
            })}
            <div className="pers-foot">
              <button className="btn btn-ghost" onClick={handleSkip} disabled={submitting || skipping}>
                {skipping ? 'Yükleniyor...' : 'Atla'}
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={!canSubmit || submitting || skipping}>
                {submitting ? 'Gönderiliyor...' : 'Cevapla ve Devam Et'}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page fadeup">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="pers-head">
          <h1>Bir adım daha — kararını sana göre dengeleyeyim.</h1>
        </div>

        <div className="pers-wrap">
          <div>
            <div className="pers-q">
              <h3>Hangi cihazı kullanıyorsun?</h3>
              <div className="pers-opts">
                {['iphone', 'android', 'both'].map((k) => (
                  <button key={k} className="pers-opt" data-on={device === k} onClick={() => setDevice(k)}>
                    {DEVICE_LABELS[k].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="pers-q">
              <h3>Senin için en önemli özellikler?</h3>
              <div className="pers-opts">
                {Object.keys(PRIORITY_LABELS).map((k) => (
                  <button key={k} className="pers-opt" data-on={priorities.includes(k)} onClick={() => togglePriority(k)}>
                    {PRIORITY_LABELS[k].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="pers-q">
              <h3>Bütçe esnekliği?</h3>
              <div className="pers-opts">
                {['tight', 'flexible', 'irrelevant'].map((k) => (
                  <button key={k} className="pers-opt" data-on={budget === k} onClick={() => setBudget(k)}>
                    {BUDGET_LABELS[k].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="pers-foot">
              <button className="btn btn-ghost" onClick={handleSkip} disabled={submitting || skipping}>
                {skipping ? 'Yükleniyor...' : 'Atla'}
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={!canSubmit || submitting || skipping}>
                {submitting ? 'Hesaplanıyor...' : 'Kararı Üret'}
              </button>
            </div>
          </div>

          <div className="pers-preview">
            <div className="pers-preview-score">
              <span className="pers-preview-score-n">{decision.score}</span>
              <span className="pers-preview-score-of">/ 100</span>
            </div>
            <div className="pers-preview-badge" data-tier={decision.tier}>{decision.badge}</div>
            <p dangerouslySetInnerHTML={{ __html: decision.summary.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── COMPARISON ────────────────────────────────────────── */
export function Comparison({ product, onBack }) {
  const p = product || MOCK_PRODUCT;
  const alt = p.alternatives?.[0] || RIVAL_PRODUCT;

  const dnaA = p.dna || p.category_scores?.map(c => ({ axis: c.name, value: c.score })) || MOCK_PRODUCT.dna;
  const dnaB = alt.dna || alt.category_scores?.map(c => ({ axis: c.name, value: c.score })) || RIVAL_PRODUCT.dna;

  const axesA = dnaA.map((a) => ({ axis: a.axis || a.name, value: 100 - (a.value || a.score || 50) }));
  const axesB = dnaB.map((a) => ({ axis: a.axis || a.name, value: 100 - (a.value || a.score || 50) }));

  const cats = p.category_scores?.map((c, i) => {
    const rivalCat = alt.category_scores?.[i] || { score: Math.min(100, Math.max(30, c.score + (i % 2 === 0 ? 5 : -8))) };
    return {
      key: c.key || `cat-${i}`,
      name: c.name,
      a: c.score,
      b: rivalCat.score,
    };
  }) || COMPARISON_CATEGORIES;

  return (
    <section className="page fadeup">
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div className="cmp-head">
          <h1>{p.name} <span style={{ color: 'var(--fg-mute)', fontWeight: 400 }}>vs</span> {alt.name || 'Alternatif Ürün'}</h1>
          <button className="btn btn-ghost" onClick={onBack}>← Geri</button>
        </div>

        <div className="panel">
          <div className="cmp-overlay-panel">
            <ComparisonRadar axesA={axesA} axesB={axesB} size={400} />
            <div className="cmp-overlay-side">
              <h3>DNA & Güvenilirlik Karşılaştırması</h3>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--fg-dim)', marginBottom: 16 }}>
                Yapay zeka (AI) analiz motorumuz, incelediğiniz <strong style={{ color: 'var(--accent)' }}>{p.name}</strong> ile bu ürüne en güçlü alternatif olan <strong style={{ color: 'var(--good)' }}>{alt.name || 'Alternatif Ürün'}</strong> modelinin güvenilirlik ve performans metriklerini kıyasladı.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--fg-mute)' }}>{p.name} Güven Skoru:</span>
                  <strong style={{ color: 'var(--accent)' }}>{p.trustScore}/100</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--fg-mute)' }}>{alt.name || 'Alternatif Ürün'} Güven Skoru:</span>
                  <strong style={{ color: 'var(--good)' }}>{alt.trustScore || alt.trust_score || 85}/100</strong>
                </div>
                {alt.matchReason && (
                  <div style={{ fontSize: 12, color: 'var(--fg-dim)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10, marginTop: 4 }}>
                    <span style={{ color: 'var(--good)', fontWeight: 600 }}>AI Alternatif Seçim Gerekçesi: </span>
                    {alt.matchReason}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 20 }}>
          <div className="cmp-cats">
            {cats.map((c) => (
              <div key={c.key} className="cmp-cat">
                <span className="cmp-cat-name">{c.name}</span>
                <div className="cmp-cat-side cmp-cat-side-a">
                  <span className="cmp-cat-val">{c.a}</span>
                  <div className="cmp-cat-bar cmp-cat-bar-a"><span style={{ width: `${c.a}%` }} /></div>
                </div>
                <div className="cmp-cat-side">
                  <div className="cmp-cat-bar cmp-cat-bar-b"><span style={{ width: `${c.b}%` }} /></div>
                  <span className="cmp-cat-val">{c.b}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function relTime(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'şimdi';
  if (m < 60) return `${m}dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s önce`;
  return `${Math.floor(h / 24)}g önce`;
}

export function History({ items, onOpen, onReanalyze, onClear, onTogglePin }) {
  const [filter, setFilter]   = useState('all');
  const [sort, setSort]       = useState('recent');
  const [query, setQuery]     = useState('');

  const total        = items.length;
  const buys         = items.filter(i => i.decisionTier === 'good').length;
  const conditional  = items.filter(i => i.decisionTier === 'warn').length;
  const rejected     = items.filter(i => i.decisionTier === 'bad').length;
  const totalSignals = items.reduce((s, i) => s + (i.signals || 0), 0);
  const avgTrust     = total ? Math.round(items.reduce((s, i) => s + (i.trustScore || 0), 0) / total) : 0;

  let list = items.slice();
  if (filter === 'pinned') list = list.filter(i => i.pinned);
  else if (filter !== 'all') list = list.filter(i => i.decisionTier === filter);
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    list = list.filter(i => (i.name + ' ' + i.category + ' ' + i.query).toLowerCase().includes(q));
  }
  if (sort === 'trust')   list.sort((a, b) => b.trustScore - a.trustScore);
  else if (sort === 'signals') list.sort((a, b) => b.signals - a.signals);

  const buckets = [
    { id: 'today', label: 'BUGÜN',     items: list.filter(i => i.bucket === 'today') },
    { id: 'week',  label: 'BU HAFTA',  items: list.filter(i => i.bucket === 'week') },
    { id: 'older', label: 'DAHA ÖNCE', items: list.filter(i => i.bucket === 'older') },
  ].filter(b => b.items.length > 0);

  const FILTERS = [
    { id: 'all',    label: 'Hepsi',   count: total },
    { id: 'good',   label: 'AL',      count: buys,        tier: 'good' },
    { id: 'warn',   label: 'Koşullu', count: conditional, tier: 'warn' },
    { id: 'bad',    label: 'Alma',    count: rejected,    tier: 'bad' },
    { id: 'pinned', label: 'Sabitli', count: items.filter(i => i.pinned).length },
  ];

  return (
    <section className="page fadeup">
      <div className="hist-wrap">
        <span className="file-stamp">Arşiv · {String(total).padStart(4, '0')} DOSYA</span>

        <div className="hist-head">
          <div className="hist-head-l">
            <span className="hist-eyebrow">
              <span className="pip pip-good pip-glow" />
              ARŞİV
            </span>
            <h1 className="hist-title">Geçmiş <span className="accent">röntgenler</span>.</h1>
            <p className="hist-sub">
              Daha önce incelediğin her ürün burada. Filtre uygula veya geçmiş sonuçları görüntüle.
            </p>
          </div>
          <div className="hist-stats">
            <div className="hist-stat"><span className="hist-stat-n">{total}</span><span className="hist-stat-l">TOPLAM DOSYA</span></div>
            <div className="hist-stat"><span className="hist-stat-n" style={{ color: 'var(--good)' }}>{buys}</span><span className="hist-stat-l">AL</span></div>
            <div className="hist-stat"><span className="hist-stat-n" style={{ color: 'var(--warn)' }}>{conditional}</span><span className="hist-stat-l">KOŞULLU</span></div>
            <div className="hist-stat"><span className="hist-stat-n" style={{ color: 'var(--bad)' }}>{rejected}</span><span className="hist-stat-l">ALMA</span></div>
            <div className="hist-stat"><span className="hist-stat-n">{totalSignals}</span><span className="hist-stat-l">SİNYAL TOPLAM</span></div>
            <div className="hist-stat"><span className="hist-stat-n">{avgTrust}<span className="hist-stat-of">/100</span></span><span className="hist-stat-l">ORT. GÜVEN</span></div>
          </div>
        </div>

        <div className="hist-toolbar">
          <div className="hist-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Dosya ara — ürün adı, kategori, sorgu…"
            />
            {query && <button className="hist-search-clear" onClick={() => setQuery('')}>✕</button>}
          </div>

          <div className="hist-filters">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={`hist-chip ${f.tier || ''}`}
                data-active={filter === f.id}
                onClick={() => setFilter(f.id)}>
                {f.tier && <span className={`pip pip-${f.tier}`} />}
                {f.id === 'pinned' && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M14 4l6 6-4 1-3 6-2-2-5 5v-5l-2-2 6-3 1-4 3-2z"/></svg>
                )}
                <span>{f.label}</span>
                <span className="hist-chip-c">{f.count}</span>
              </button>
            ))}
          </div>

          <div className="hist-sort">
            <span className="hist-sort-l">Sırala</span>
            {[{ id: 'recent', label: 'Yeni' }, { id: 'trust', label: 'Güven' }, { id: 'signals', label: 'Sinyal' }].map((s) => (
              <button key={s.id} className="hist-sort-btn" data-active={sort === s.id} onClick={() => setSort(s.id)}>{s.label}</button>
            ))}
            <button className="hist-sort-btn danger" onClick={() => onClear()}>Tümünü Sil</button>
          </div>
        </div>

        <div className="hist-row hist-row-head">
          <span className="hist-c-no">DOSYA</span>
          <span className="hist-c-prod">ÜRÜN</span>
          <span className="hist-c-when">RÖNTGEN ZAMANI</span>
          <span className="hist-c-trust">GÜVEN</span>
          <span className="hist-c-sig">SİNYAL</span>
          <span className="hist-c-match">UYUM</span>
          <span className="hist-c-dec">KARAR</span>
          <span className="hist-c-actions"></span>
        </div>

        {list.length === 0 && (
          <div className="hist-empty">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', color: 'var(--fg-mute)' }}>
              ▸ EŞLEŞEN DOSYA YOK
            </span>
            <p>Filtreyi gevşet veya yeni bir röntgen başlat.</p>
          </div>
        )}

        {buckets.map((b) => (
          <div key={b.id} className="hist-bucket">
            <div className="hist-bucket-h">
              <span className="hist-bucket-l">{b.label}</span>
              <span className="hist-bucket-c">{b.items.length} dosya</span>
              <span className="hist-bucket-rule" />
            </div>
            {b.items.map((item, idx) => (
              <div
                key={item.id}
                className={`hist-row hist-row-data tier-${item.decisionTier}${item.current ? ' is-current' : ''}`}
                onClick={() => onOpen(item)}>

                <span className="hist-c-no">
                  <button
                    className="hist-pin"
                    data-on={!!item.pinned}
                    onClick={(e) => { e.stopPropagation(); onTogglePin(item.id); }}
                    title={item.pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M14 4l6 6-4 1-3 6-2-2-5 5v-5l-2-2 6-3 1-4 3-2z"/></svg>
                  </button>
                  <span className="hist-c-no-n">·{String(idx + 1).padStart(3, '0')}</span>
                  {item.current && <span className="hist-tag-current">AKTİF</span>}
                </span>

                <span className="hist-c-prod">
                  <div className="hist-img">
                    <div className="hist-img-stripes" />
                    {(() => {
                      const imgVal = item.image || '';
                      const isUrl = typeof imgVal === 'string' && (
                        imgVal.startsWith('http://') || 
                        imgVal.startsWith('https://') || 
                        imgVal.startsWith('/') || 
                        imgVal.startsWith('data:') ||
                        /\.(jpg|jpeg|png|webp|gif|svg)/i.test(imgVal)
                      );
                      if (isUrl) {
                        return (
                          <img 
                            src={imgVal} 
                            alt="" 
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'cover', 
                              position: 'absolute', 
                              top: 0, 
                              left: 0, 
                              zIndex: 1,
                              borderRadius: '6px'
                            }} 
                          />
                        );
                      }
                      return (
                        <span style={{ 
                          zIndex: 1, 
                          fontSize: imgVal.length > 2 ? '7px' : '14px',
                          textAlign: 'center',
                          lineHeight: 1.1,
                          padding: '0 2px',
                          wordBreak: 'break-all'
                        }}>
                          {imgVal || '📦'}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="hist-prod-meta">
                    <span className="hist-prod-cat">{item.category}</span>
                    <span className="hist-prod-name">{item.name}</span>
                    <span className="hist-prod-headline">▸ {item.headline || '—'}</span>
                  </div>
                </span>

                <span className="hist-c-when">
                  <span className="hist-when-rel">{relTime(item.whenAbs)}</span>
                  <span className="hist-when-abs">{item.whenAbs ? new Date(item.whenAbs).toLocaleDateString('tr-TR') : ''}</span>
                  <span className="hist-when-src">
                    <span className="k-num">{(item.sources?.reviews || 0).toLocaleString('tr-TR')}</span> yorum ·{' '}
                    <span className="k-num">{item.sources?.forum || 0}</span> forum ·{' '}
                    <span className="k-num">{item.sources?.video || 0}</span> vid
                  </span>
                </span>

                <span className="hist-c-trust">
                  <span className="hist-trust-n" style={{ color: item.trustScore >= 75 ? 'var(--good)' : item.trustScore >= 50 ? 'var(--warn)' : 'var(--bad)' }}>
                    {item.trustScore}
                  </span>
                  <span className="hist-trust-of">/100</span>
                  <span className="hist-trust-bar">
                    <span style={{ width: `${item.trustScore}%`, background: item.trustScore >= 75 ? 'var(--good)' : item.trustScore >= 50 ? 'var(--warn)' : 'var(--bad)' }} />
                  </span>
                </span>

                <span className="hist-c-sig">
                  <span className="hist-sig-n" style={{ color: item.signals >= 30 ? 'var(--bad)' : item.signals >= 15 ? 'var(--warn)' : 'var(--good)' }}>
                    {item.signals}
                  </span>
                  <span className="hist-sig-l">sinyal</span>
                </span>

                <span className="hist-c-match">
                  <span className="hist-match-n">{item.matchScore || 0}</span>
                  <span className="hist-match-of">/100</span>
                </span>

                <span className="hist-c-dec">
                  <span className={`hist-dec-badge ${item.decisionTier}`}>{item.decision}</span>
                </span>

                <span className="hist-c-actions">
                  <button
                    className="hist-iconbtn"
                    title="Tekrar röntgenle"
                    onClick={(e) => { e.stopPropagation(); onReanalyze(item); }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v6h-6"/>
                    </svg>
                  </button>
                  <button
                    className="hist-iconbtn danger"
                    title="Sil"
                    onClick={(e) => { e.stopPropagation(); onClear(item.id); }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/>
                    </svg>
                  </button>
                  <svg className="hist-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ExtensionPreview({ threadId, onClose }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!threadId) return;
    getAnalysisSummary(threadId)
      .then(data => setSummary(data))
      .catch(() => {});
  }, [threadId]);

  const prodName    = summary?.product_name || MOCK_PRODUCT.name;
  const trustScore  = summary?.trust_score ?? MOCK_PRODUCT.trustScore;
  const badge       = summary?.recommendation || MOCK_PRODUCT.decision?.badge || 'KOŞULLU AL';
  const rationale   = summary?.rationale || summary?.summary || `Uyum ${trustScore}/100`;

  return (
    <div className="ext-overlay" onClick={onClose}>
      <div className="ext-frame" onClick={(e) => e.stopPropagation()}>
        <button className="ext-close" onClick={onClose}>×</button>
        <div className="ext-bar">chrome — Side Panel</div>
        <div className="ext-body">
          <div className="ext-h">
            <h2 className="ext-h-prod">{prodName}</h2>
            <BrandMark size={22} />
          </div>
          <div className="ext-trust">
            <MiniGauge value={trustScore} />
            <div>
              <span className="ext-h-cat">{badge}</span>
              <p style={{ fontSize: 12 }}>{rationale}</p>
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 20 }} onClick={onClose}>
            Detaylı Rapor
          </button>
        </div>
      </div>
    </div>
  );
}
