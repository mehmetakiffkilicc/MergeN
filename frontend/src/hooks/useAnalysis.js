import { useState, useEffect, useRef } from 'react';
import { streamAnalysis } from '../lib/api';
import { PHASES } from '../lib/mockData';

export function useAnalysis() {
  const [streamActive, setStreamActive] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [messages, setMessages] = useState([]);
  const [counters, setCounters] = useState({ reviews: 0, forums: 0, videos: 0, signals: 0 });
  const [agentStates, setAgentStates] = useState({
    research: 'idle', xray: 'idle', analysis: 'idle', advisor: 'idle', challenger: 'idle'
  });
  const [tickerMsg, setTickerMsg] = useState('Başlatılıyor...');
  const sourceCountsRef = useRef({ trendyol: 0, hepsiburada: 0 });

  // Mock simulation
  const startMockSimulation = () => {
    const phaseNames = { research: 'Araştırma', xray: 'Röntgen', analysis: 'Analiz', advisor: 'Danışman', challenger: 'Şeytanın Avukatı' };
    const mockPhases = [
      { id: 'research',   duration: 2500, messages: ['Tavily kazıma başlatıldı: trendyol.com', '847 yorum (Trendyol) + 412 yorum (Hepsiburada)', 'Forum: donanimhaber, technopat taranıyor', 'YouTube: 4 inceleme videosu, 38 dk toplam içerik'] },
      { id: 'xray',       duration: 3500, messages: ['Görsel doğrulama: stüdyo ↔ kullanıcı fotoğrafları', 'Multimodal video kesitleri (4 kesit x 30sn)', 'PİL İDDİASI ÇELİŞKİSİ: 30sa → ekranda 22sa'] },
      { id: 'analysis',   duration: 3000, messages: ['Kategori skorlama: ses, ANC, pil, mikrofon, rahatlık', 'Top 3 güçlü yön + top 3 zayıf yön', 'Forum vs E-ticaret çapraz tutarlılık'] },
      { id: 'advisor',    duration: 3500, messages: ['Profil eşleştirme: "iPhone + ANC öncelikli"', 'Kişisel uyum skoru hesaplanıyor → 82/100', 'Alternatif arama: Sony WF-1000XM5, Bose QC Ultra', 'Karar: KOŞULLU AL'] },
      { id: 'challenger', duration: 2000, messages: ['Şeytanın avukatı modu aktif', 'Karara karşı 3 senaryo üretiliyor', 'Final dengelenmiş tavsiye'] },
    ];

    let cumulative = 0;
    const timeouts = [];
    const finalCounters = { reviews: 1206, forums: 136, videos: 4, signals: 27 };

    const totalDuration = mockPhases.reduce((s, p) => s + p.duration, 0);
    const counterStart = performance.now();
    let counterRaf;
    const animateCounters = (ts) => {
      const p = Math.min(1, (ts - counterStart) / totalDuration);
      const eased = 1 - Math.pow(1 - p, 2);
      setCounters({
        reviews: Math.round(finalCounters.reviews * eased),
        forums:  Math.round(finalCounters.forums * eased),
        videos:  Math.round(finalCounters.videos * eased),
        signals: Math.round(finalCounters.signals * eased),
      });
      if (p < 1) counterRaf = requestAnimationFrame(animateCounters);
    };
    counterRaf = requestAnimationFrame(animateCounters);

    mockPhases.forEach((phase, pi) => {
      timeouts.push(setTimeout(() => {
        setPhaseIdx(pi);
        setAgentStates(s => {
          const next = { ...s, [phase.id]: 'active' };
          if (pi > 0) next[mockPhases[pi - 1].id] = 'done';
          return next;
        });
        const label = phaseNames[phase.id] || phase.id;
        setTickerMsg(`${label} aşaması başladı...`);
        setMessages(arr => [...arr.slice(-6), { phase: label, text: `${label} aşaması başladı.` }]);
      }, cumulative));

      const msgInterval = phase.duration / (phase.messages.length + 1);
      phase.messages.forEach((m, mi) => {
        timeouts.push(setTimeout(() => {
          setMessages(arr => [...arr.slice(-6), { phase: phaseNames[phase.id] || phase.id, text: m }]);
          setTickerMsg(m.slice(0, 80));
        }, cumulative + msgInterval * (mi + 1)));
      });

      cumulative += phase.duration;
    });

    timeouts.push(setTimeout(() => {
      cancelAnimationFrame(counterRaf);
      setCounters(finalCounters);
      setAgentStates({ research: 'done', xray: 'done', analysis: 'done', advisor: 'done', challenger: 'done' });
      setTickerMsg('Analiz tamamlandı.');
      setStreamActive(false);
    }, cumulative));

    return () => { timeouts.forEach(clearTimeout); cancelAnimationFrame(counterRaf); };
  };

  // SSE streaming
  useEffect(() => {
    if (!streamActive) return;

    // Track if this effect's data is still valid (prevent stale closures)
    let isMounted = true;
    let lastPhase = null;
    const phaseNames = { research: 'Tulpar', xray: 'Kam', analysis: 'Bilge', advisor: 'Yargucu', challenger: 'Erlik' };

    let fallbackTimer = setTimeout(() => {
      if (isMounted) {
        setTickerMsg('Veri kaynakları taranıyor, bu işlem biraz zaman alabilir...');
        setMessages(arr => [...arr.slice(-9), { phase: 'TARAMA', text: 'Yorumlar ve forum gönderileri toplanıyor, bu biraz zaman alabilir' }]);
      }
    }, 5000);

    let heartbeatInterval = null;
    let lastEventTime = null;
    const heartbeatMessages = [
      'Gerçek kullanıcı yorumları okunuyor ve değerlendiriliyor',
      'Forum tartışmaları taranıyor, fiyat geçmişi kontrol ediliyor',
      'YouTube incelemeleri analiz ediliyor, iddialar doğrulanıyor',
      'Manipülasyon belirtileri aranıyor, güven skoru hesaplanıyor',
      'Sonuçlar derleniyor, kişisel öneri hazırlanıyor',
    ];
    let heartbeatMsgIdx = 0;
    let gotServerEvent = false;

    const cancel = streamAnalysis('', (event) => {
      if (!isMounted) return;
      clearTimeout(fallbackTimer);
      lastEventTime = Date.now();

      if (!heartbeatInterval) {
        heartbeatInterval = setInterval(() => {
          const elapsed = lastEventTime ? Math.round((Date.now() - lastEventTime) / 1000) : 0;
          if (elapsed >= 10) {
            const msg = heartbeatMessages[heartbeatMsgIdx % heartbeatMessages.length];
            heartbeatMsgIdx++;
            setTickerMsg(msg);
            setMessages(arr => [...arr.slice(-9), { phase: 'ANALİZ', text: msg }]);
          }
        }, 5000);
      }

      if (event.type === 'phase') {
        gotServerEvent = true;
        const phaseName = event.phase;
        setAgentStates(s => {
          const next = { ...s, [phaseName]: 'active' };
          if (lastPhase && lastPhase !== phaseName) next[lastPhase] = 'done';
          return next;
        });
        lastPhase = phaseName;
        const pIdx = PHASES.findIndex(p => p.id === phaseName);
        if (pIdx !== -1) setPhaseIdx(pIdx);
        const label = phaseNames[phaseName] || phaseName;
        setTickerMsg(`${label} aşaması başladı...`);
        setMessages(arr => [...arr.slice(-6), { phase: label, text: `${label} aşaması başladı.` }]);
        if (event.reviews != null || event.forums != null || event.videos != null) {
          setCounters(prev => ({
            ...prev,
            ...(event.reviews > prev.reviews ? { reviews: event.reviews } : {}),
            ...(event.forums  > prev.forums  ? { forums:  event.forums  } : {}),
            ...(event.videos  > prev.videos  ? { videos:  event.videos  } : {}),
          }));
        }
        setCounters(prev => ({ ...prev, signals: prev.signals + 1 }));
      } else if (event.type === 'count') {
        gotServerEvent = true;
        const src = event.source;
        const n = event.n || 0;
        if (src === 'trendyol') {
          sourceCountsRef.current.trendyol = Math.max(sourceCountsRef.current.trendyol, n);
        } else if (src === 'hepsiburada') {
          sourceCountsRef.current.hepsiburada = Math.max(sourceCountsRef.current.hepsiburada, n);
        }
        if (src === 'trendyol' || src === 'hepsiburada') {
          const total = sourceCountsRef.current.trendyol + sourceCountsRef.current.hepsiburada;
          setCounters(prev => ({ ...prev, reviews: Math.max(prev.reviews, total) }));
        } else if (src === 'forum') {
          setCounters(prev => ({ ...prev, forums: Math.max(prev.forums, n) }));
        } else if (src === 'youtube') {
          setCounters(prev => ({ ...prev, videos: Math.max(prev.videos, n) }));
        }
      } else if (event.type === 'progress') {
        gotServerEvent = true;
        setTickerMsg(event.line.slice(0, 80));
        setMessages(arr => [...arr.slice(-9), { phase: phaseNames[lastPhase] || lastPhase || 'TULPAR', text: event.line }]);
      } else if (event.type === 'error') {
        clearInterval(heartbeatInterval);
        setStreamActive(false);
        if (!gotServerEvent) {
          setCounters({ reviews: 0, forums: 0, videos: 0, signals: 0 });
        }
        setTickerMsg(`Hata oluştu: ${event.message}`);
      }
    });

    return () => {
      isMounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (cancel) cancel();
    };
  }, [streamActive]);

  return {
    streamActive,
    setStreamActive,
    phaseIdx,
    messages,
    counters,
    agentStates,
    tickerMsg,
    sourceCountsRef,
    startMockSimulation,
  };
}
