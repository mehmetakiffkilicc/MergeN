import React, { useState, useEffect, useRef } from 'react';
import { BrandMark } from './components/Widgets';
import { Hero, Analysis, Dashboard, Chat, Personalization, Comparison, History } from './components/Scenes';
import ErrorBoundary from './components/ErrorBoundary';
import { useFocusTrap } from './hooks/useFocusTrap';
import { streamAnalysis, sendAnswers, getAnalysisResult } from './lib/api';
import { adaptProductState, buildFallbackProductState } from './lib/adapters';
import { saveToHistory, loadHistory, togglePin as togglePinHistory, deleteFromHistory, clearHistory } from './lib/history';
import { PHASES, MOCK_PRODUCT, MOCK_PRODUCT_ASUS } from './lib/mockData';
import { SCENE_NAMES } from './constants/scenes';

function App() {
  const [scene, setScene] = useState(SCENE_NAMES.HERO);
  const [query, setQuery] = useState('');
  const [analyzedProduct, setAnalyzedProduct] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [interruptQuestions, setInterruptQuestions] = useState([]);
  const [scraperLog, setScraperLog] = useState('');
  const [profile, setProfile] = useState(null);

  const [showGuide, setShowGuide] = useState(false);
  const [historyItems, setHistoryItems] = useState(() => loadHistory());

  // Centralized Live Streaming Pipeline State
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [messages, setMessages] = useState([]);
  const [counters, setCounters] = useState({ reviews: 0, forums: 0, videos: 0, signals: 0 });
  const [agentStates, setAgentStates] = useState({
    research: 'idle', xray: 'idle', analysis: 'idle', advisor: 'idle', challenger: 'idle'
  });
  const [tickerMsg, setTickerMsg] = useState('Başlatılıyor...');
  const [streamActive, setStreamActive] = useState(false);
  const sourceCountsRef = useRef({ trendyol: 0, hepsiburada: 0 });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [scene]);

  // URL parameters listener for Chrome Extension integrations
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryParam = params.get('query');
    const analyzeParam = params.get('analyze');
    const threadIdParam = params.get('threadId');
    const directResultParam = params.get('directResult');

    if (directResultParam === 'true' && queryParam) {
      const qLower = queryParam.toLowerCase();
      const isAsus = qLower.includes('asus') || qLower.includes('a15');
      setThreadId(isAsus ? 'asus-tuf-a15' : 'apple-airpods-pro-2');
      setAnalyzedProduct(isAsus ? MOCK_PRODUCT_ASUS : MOCK_PRODUCT);
      setQuery(queryParam);
      setScene(SCENE_NAMES.DASHBOARD);
      return;
    }

    if (threadIdParam) {
      setScene(SCENE_NAMES.ANALYSIS);
      setTickerMsg('Önbelleklenen analiz detayları yükleniyor...');
      setThreadId(threadIdParam);
      
      getAnalysisResult(threadIdParam)
          .then(fullState => {
            const product = adaptProductState(fullState, threadIdParam);
            setAnalyzedProduct(product);
            setQuery(product.name || queryParam || '');
            const updated = saveToHistory(product);
            setHistoryItems(updated);
            setScene(SCENE_NAMES.DASHBOARD);
        })
          .catch(err => {
            console.error('Thread ID detayları yüklenemedi:', err);
            // Fallback to query analysis if thread loading fails
            if (queryParam) {
              handleStartAnalysis(queryParam);
            } else {
              setScene(SCENE_NAMES.HERO);
          }
        });
    } else if (queryParam) {
      if (analyzeParam === 'true') {
        handleStartAnalysis(queryParam);
      } else {
        setQuery(queryParam);
        setScene(SCENE_NAMES.HERO);
      }
    }
  }, []);

  // Mock pipeline simulation (bootstrap fallback when backend unavailable)
  const startMockSimulation = (q) => {
    const isAsus = (q || '').toLowerCase().includes('asus') || (q || '').toLowerCase().includes('a15');
    const phaseNames = { research: 'Araştırma', xray: 'Röntgen', analysis: 'Analiz', advisor: 'Danışman', challenger: 'Şeytanın Avukatı' };
    const mockPhases = isAsus ? [
      { id: 'research',   duration: 2500, messages: ['Tavily kazıma başlatıldı: asus.com, trendyol.com', '420 yorum (Trendyol) + 180 yorum (Hepsiburada)', 'Forum: donanimhaber taranıyor', 'YouTube: 8 inceleme videosu toplandı'] },
      { id: 'xray',       duration: 3500, messages: ['Görsel doğrulama: kasa tasarımı tam uyuşuyor', 'Multimodal video kesitleri analiz ediliyor', 'ISI ÇELİŞKİSİ: İddia serin → Gerçek CPU 92°C'] },
      { id: 'analysis',   duration: 3000, messages: ['Kategori skorlama: performans, soğutma, ekran', 'Top 3 güçlü yön + top 2 zayıf yön', 'Soğutma şikayetleri forumlarla doğrulandı'] },
      { id: 'advisor',    duration: 3500, messages: ['Profil eşleştirme: "Oyun Öncelikli"', 'Kişisel uyum skoru hesaplanıyor → 85/100', 'Alternatif arama: Lenovo LOQ, Acer Nitro', 'Karar: AL'] },
      { id: 'challenger', duration: 2000, messages: ['Şeytanın avukatı modu aktif', 'Karara karşı 2 senaryo üretiliyor', 'Final dengelenmiş tavsiye'] },
    ] : [
      { id: 'research',   duration: 2500, messages: ['Tavily kazıma başlatıldı: trendyol.com', '847 yorum (Trendyol) + 412 yorum (Hepsiburada)', 'Forum: donanimhaber, technopat taranıyor', 'YouTube: 4 inceleme videosu, 38 dk toplam içerik'] },
      { id: 'xray',       duration: 3500, messages: ['Görsel doğrulama: stüdyo ↔ kullanıcı fotoğrafları', 'Multimodal video kesitleri (4 kesit x 30sn)', 'PİL İDDİASI ÇELİŞKİSİ: 30sa → ekranda 22sa'] },
      { id: 'analysis',   duration: 3000, messages: ['Kategori skorlama: ses, ANC, pil, mikrofon, rahatlık', 'Top 3 güçlü yön + top 3 zayıf yön', 'Forum vs E-ticaret çapraz tutarlılık'] },
      { id: 'advisor',    duration: 3500, messages: ['Profil eşleştirme: "iPhone + ANC öncelikli"', 'Kişisel uyum skoru hesaplanıyor → 82/100', 'Alternatif arama: Sony WF-1000XM5, Bose QC Ultra', 'Karar: KOŞULLU AL'] },
      { id: 'challenger', duration: 2000, messages: ['Şeytanın avukatı modu aktif', 'Karara karşı 3 senaryo üretiliyor', 'Final dengelenmiş tavsiye'] },
    ];

    let cumulative = 0;
    const timeouts = [];
    const finalCounters = { 
      reviews: isAsus ? 600 : 1206, 
      forums: isAsus ? 12 : 136, 
      videos: isAsus ? 8 : 4, 
      signals: isAsus ? 32 : 27 
    };

    // Progressive counter animation
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
      setTimeout(() => {
        import('./lib/mockData').then(m => {
          setThreadId(isAsus ? 'asus-tuf-a15' : 'apple-airpods-pro-2');
          setAnalyzedProduct(isAsus ? m.MOCK_PRODUCT_ASUS : m.MOCK_PRODUCT);
          setInterruptQuestions(isAsus ? [
            { 
              id: 'q1', 
              question: 'Dizüstü bilgisayarı ağırlıklı olarak ne için kullanacaksın?', 
              options: [
                {label: 'Sadece Oyun', value: 'gaming'}, 
                {label: 'Oyun ve Yazılım/İş', value: 'mixed'}, 
                {label: 'Grafik Tasarım / Video Kurgu', value: 'design'}
              ] 
            },
            { 
              id: 'q2', 
              question: 'Oyun oynarken fan sesi seni ne kadar rahatsız eder?', 
              options: [
                {label: 'Kulaklık takarım, sorun değil', value: 'headset'}, 
                {label: 'Biraz ses olabilir ama çok gürültülü olmasın', value: 'moderate'}, 
                {label: 'Sessiz çalışması benim için çok önemli', value: 'quiet'}
              ] 
            }
          ] : [
            { 
              id: 'q1', 
              question: 'AirPods Pro 2 almayı düşünüyorsun ancak ağırlıklı olarak müzik dinleyeceğin ortamı nasıl tanımlarsın?', 
              options: [
                {label: 'Toplu taşıma / Gürültülü', value: 'commute'}, 
                {label: 'Ofis / Ev (Sessiz ortam)', value: 'office'}, 
                {label: 'Spor yaparken / Dış mekan', value: 'sports'}, 
                {label: 'Karışık kullanım', value: 'mixed'}
              ] 
            },
            { 
              id: 'q2', 
              question: 'Müzik dinlerken bas frekansların çok baskın olması hoşuna gider mi, yoksa daha dengeli/vokal ağırlıklı bir ses mi istersin?', 
              options: [
                {label: 'Bas ağırlıklı olmalı', value: 'bass'}, 
                {label: 'Dengeli / Vokal odaklı', value: 'balanced'}, 
                {label: 'Fark etmez', value: 'any'}
              ] 
            },
            { 
              id: 'q3', 
              question: 'Mikrofon kalitesi senin için ne kadar kritik? Günde kaç saat telefon veya toplantı görüşmesi yaparsın?', 
              options: [
                {label: 'Çok kritik (2+ saat)', value: 'high'}, 
                {label: 'Orta seviye (1-2 saat)', value: 'medium'}, 
                {label: 'Çok az (Sadece müzik/video)', value: 'low'}
              ] 
            }
          ]);
          setScene('personalization');
        });
      }, 600);
    }, cumulative));

    return () => { timeouts.forEach(clearTimeout); cancelAnimationFrame(counterRaf); };
  };

  // Focus trap for guide modal
  const modalRef = useFocusTrap(showGuide, () => setShowGuide(false));

  // Handle centralized SSE pipeline stream connection
  useEffect(() => {
    if (!streamActive || !query) return;

    let lastPhase = null;
    const phaseNames = { research: 'Tulpar', xray: 'Kam', analysis: 'Bilge', advisor: 'Yargucu', challenger: 'Erlik' };


    let fallbackTimer = setTimeout(() => {
      setTickerMsg('Veri kaynakları taranıyor, bu işlem biraz zaman alabilir...');
      setMessages(arr => [...arr.slice(-9), { phase: 'TARAMA', text: 'Yorumlar ve forum gönderileri toplanıyor, bu biraz zaman alabilir' }]);
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

    const cancel = streamAnalysis(query, (event) => {
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
        const isFirstPhase = lastPhase === null;
        lastPhase = phaseName;
        const pIdx = PHASES.findIndex(p => p.id === phaseName);
        if (pIdx !== -1) setPhaseIdx(pIdx);
        const label = phaseNames[phaseName] || phaseName;
        setTickerMsg(`${label} aşaması başladı...`);
        setMessages(arr => [...arr.slice(-6), { phase: label, text: `${label} aşaması başladı.` }]);
        // research bitti → gerçek sayıları yaz (mevcut sayaçtan büyükse)
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
        setScraperLog(event.line);
        setTickerMsg(event.line.slice(0, 80));
        setMessages(arr => [...arr.slice(-9), { phase: phaseNames[lastPhase] || lastPhase || 'TULPAR', text: event.line }]);
      } else if (event.type === 'interrupt') {
        clearInterval(heartbeatInterval);
        setAgentStates(s => ({ ...s, advisor: 'done' }));
        setStreamActive(false);
        handleInterrupt(event.questions || [], event.thread_id);
      } else if (event.type === 'done') {
        clearInterval(heartbeatInterval);
        setAgentStates({ research: 'done', xray: 'done', analysis: 'done', advisor: 'done', challenger: 'done' });
        setTickerMsg('Analiz tamamlandı.');
        setStreamActive(false);
        if (event.complete && event.thread_id) {
          getAnalysisResult(event.thread_id)
            .then(fullState => {
              const product = adaptProductState(fullState, event.thread_id);
              handleAnalysisComplete(product);
            })
            .catch(err => {
              console.error('Sonuç alınamadı:', err);
              handleAnalysisComplete(null);
            });
        }
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
      clearInterval(heartbeatInterval);
      clearTimeout(fallbackTimer);
      cancel();
    };
  }, [streamActive, query]);

  const isCachedProduct = (q) => {
    const qLower = (q || '').toLowerCase();
    return qLower.includes('airpods') || qLower.includes('asus tuf') || qLower.includes('a15');
  };

  const handleStartAnalysis = (q) => {
    setQuery(q);
    
    // Reset all streaming states
    setPhaseIdx(0);
    setMessages([]);
    setCounters({ reviews: 0, forums: 0, videos: 0, signals: 0 });
    sourceCountsRef.current = { trendyol: 0, hepsiburada: 0 };
    setAgentStates({
      research: 'idle', xray: 'idle', analysis: 'idle', advisor: 'idle', challenger: 'idle'
    });

    // Go directly to analysis scene
    setScene(SCENE_NAMES.ANALYSIS);

    if (isCachedProduct(q)) {
      setTickerMsg('Önbelleklenen analiz yükleniyor...');
      setStreamActive(false);
      // Start mock simulation immediately
      setTimeout(() => startMockSimulation(q), 500);
    } else {
      setTickerMsg('Veri kaynaklarına bağlanılıyor...');
      setMessages([
        { phase: 'HEDEF', text: `"${q}" araştırılıyor — binlerce yorum ve forum taranacak` },
        { phase: 'HEDEF', text: 'Trendyol, Hepsiburada, forum siteleri ve YouTube inceleniyor' },
      ]);
      setStreamActive(true);
    }
  };

  const handleInterrupt = (questions, tid) => {
    setThreadId(tid);
    if (!questions || questions.length === 0) {
      setScene('dashboard');
      return;
    }
    setInterruptQuestions(questions);
    setScene('personalization');
  };

  const handleAnalysisComplete = (product) => {
    if (!product) {
      // Analiz başarısız — fallback ürün oluştur
      const fallback = buildFallbackProductState({
        id: threadId || 'unknown',
        name: query || 'Bilinmeyen Ürün',
        category: 'Teknoloji',
        trustScore: 0,
      }, threadId, query);
      setAnalyzedProduct(fallback);
      setScene('dashboard');
      return;
    }
    setAnalyzedProduct(product);
    const updated = saveToHistory(product);
    setHistoryItems(updated);
    setScene('dashboard');
  };

  const handlePersonalizationComplete = async (newProfile, answers) => {
    setProfile(newProfile);
    if (answers && threadId) {
      try {
        await sendAnswers(threadId, answers);
        const fullState = await getAnalysisResult(threadId);
        const product = adaptProductState(fullState, threadId);
        setAnalyzedProduct(product);
        const updated = saveToHistory(product);
        setHistoryItems(updated);
      } catch (err) {
        console.error('Answer submission failed:', err);
      }
    }
    setScene('dashboard');
  };

  const handleSkipPersonalization = async () => {
    if (threadId) {
      try {
        await sendAnswers(threadId, {});
        const fullState = await getAnalysisResult(threadId);
        const product = adaptProductState(fullState, threadId);
        setAnalyzedProduct(product);
        const updated = saveToHistory(product);
        setHistoryItems(updated);
      } catch (err) {
        console.error('Answer skip failed:', err);
      }
    }
    setScene('dashboard');
  };



  return (
    <ErrorBoundary>
      <div className={`app-root theme-minimal`}>
      <header className="header">
        <div className="header-l" onClick={() => { setStreamActive(false); setScene(SCENE_NAMES.HERO); }} style={{ cursor: 'pointer' }}>
          <BrandMark size={42} />
          <div className="logo-stack">
            <span className="logo-text">MERGEN</span>
            <span className="logo-slogan">Merge N Sources. Hit the Truth.</span>
          </div>
        </div>
        <div className="header-r">
          <button className="btn btn-ghost" onClick={() => setShowGuide(true)}>Nasıl Çalışır?</button>
          <button className="btn btn-ghost" onClick={() => { setStreamActive(false); setScene(SCENE_NAMES.HISTORY); }}>Geçmiş</button>
          <button className="btn btn-primary" onClick={() => { setStreamActive(false); setScene(SCENE_NAMES.HERO); }}>Yeni Röntgen</button>
        </div>
      </header>

      <main className="content">
        {scene === 'hero' && (
          <Hero
            onStart={handleStartAnalysis}
            onLoadExample={() => handleStartAnalysis('Apple AirPods Pro 2')}
          />
        )}

        {scene === SCENE_NAMES.ANALYSIS && (
          <Analysis
            query={query}
            phaseIdx={phaseIdx}
            messages={messages}
            counters={counters}
            agentStates={agentStates}
            tickerMsg={tickerMsg}
          />
        )}

        {scene === SCENE_NAMES.PERSONALIZATION && (
          <Personalization
            initial={profile}
            questions={interruptQuestions}
            threadId={threadId}
            onComplete={handlePersonalizationComplete}
            onSkip={handleSkipPersonalization}
          />
        )}

        {scene === SCENE_NAMES.DASHBOARD && (
          <Dashboard
            product={analyzedProduct}
            profile={profile}
            threadId={threadId}
            onOpenChat={() => setScene(SCENE_NAMES.CHAT)}
            onEditProfile={() => setScene(SCENE_NAMES.PERSONALIZATION)}
            onCompare={() => setScene(SCENE_NAMES.COMPARISON)}
          />
        )}

        {scene === SCENE_NAMES.CHAT && (
          <Chat
            product={analyzedProduct}
            threadId={threadId}
            onBack={() => setScene(SCENE_NAMES.DASHBOARD)}
          />
        )}

        {scene === SCENE_NAMES.COMPARISON && (
          <Comparison
            product={analyzedProduct}
            onBack={() => setScene(SCENE_NAMES.DASHBOARD)}
          />
        )}

        {scene === SCENE_NAMES.HISTORY && (
          <History
            items={historyItems}
            onOpen={async (item) => {
              if (item.threadId) {
                // Show loading indicator
                setTickerMsg('Geçmiş analiz verileri sunucudan yükleniyor...');
                setScraperLog('Bileşenler senkronize ediliyor...');
                setScene(SCENE_NAMES.ANALYSIS);
                setAgentStates({ research: 'active', xray: 'active', analysis: 'active', advisor: 'active', challenger: 'active' });
                try {
                  const fullState = await getAnalysisResult(item.threadId);
                  const product = adaptProductState(fullState, item.threadId);
                  setThreadId(item.threadId);
                  setAnalyzedProduct(product);
                  setScene(SCENE_NAMES.DASHBOARD);
                } catch (err) {
                  console.error('History item fetch failed:', err);
                  setAnalyzedProduct(buildFallbackProductState(item, null, null));
                  setScene(SCENE_NAMES.DASHBOARD);
                }
              } else {
                setAnalyzedProduct(buildFallbackProductState(item, null, null));
                setScene(SCENE_NAMES.DASHBOARD);
              }
            }}
            onReanalyze={(item) => handleStartAnalysis(item.name)}
            onClear={(id) => {
              if (id) { setHistoryItems(deleteFromHistory(id)); }
              else { clearHistory(); setHistoryItems([]); }
            }}
            onTogglePin={(id) => setHistoryItems(togglePinHistory(id))}
          />
        )}
      </main>

      <footer className="footer">
        <div className="footer-grid">
          <div>
            <div className="header-l" style={{ marginBottom: 12 }}>
              <BrandMark size={22} />
              <span className="logo-text" style={{ fontSize: 15 }}>MERGEN</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--fg-mute)', lineHeight: 1.6 }}>
              Gerçeği Keşfedin.
            </p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>MergeN</h4>
              <a href="#">Hakkımızda</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setShowGuide(true); }}>Nasıl Çalışır?</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setShowGuide(true); }}>Röntgen Rehberi</a>
            </div>
            <div className="footer-col">
              <h4>Kurumsal</h4>
              <a href="#">Kullanım Koşulları</a>
              <a href="#">Gizlilik Politikası</a>
              <a href="#">İletişim</a>
            </div>
          </div>
        </div>
        <div className="footer-b">
          <span>© 2026 MergeN. Tüm hakları saklıdır.</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <span>Kullanıcı Güvenliği Odaklı</span>
          </div>
        </div>
      </footer>


      
      {showGuide && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowGuide(false); }} role="dialog" aria-modal="true" aria-labelledby="guide-title">
          <div className="modal-content" ref={modalRef} style={{ maxWidth: '600px', background: 'var(--bg-dark)', padding: '32px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
              <h2 id="guide-title" style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
                  <path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                MergeN Platform Rehberi
              </h2>
              <button className="btn btn-ghost" onClick={() => setShowGuide(false)} style={{ padding: '6px', color: 'var(--fg-dim)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div style={{ color: 'var(--fg-dim)', fontSize: '13.5px', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '28px', paddingRight: '4px' }}>
              
              <section>
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--fg)', fontSize: '15px', fontWeight: 600 }}>MergeN Nedir? "Merge N Sources"</h3>
                <p style={{ margin: 0 }}>
                  <strong>MergeN</strong> ismi, İngilizce <em>"Merge N Sources" (N adet kaynağı birleştir)</em> mottosundan gelir. E-ticaret siteleri, YouTube incelemeleri ve donanım forumları gibi birbirinden bağımsız veri noktalarını tek bir potada eritir. Aynı zamanda ilhamını, Türk mitolojisinde her şeyi gören, her gerçeği hedefinden vuran <strong>Bilge Okçu Tanrısı Mergen</strong>'den alır. Amacımız, markaların pazarlama illüzyonlarını delip geçerek size en ham ve doğru bilgiyi sunmaktır.
                </p>
              </section>

              <section>
                <h3 style={{ margin: '0 0 16px 0', color: 'var(--fg)', fontSize: '15px', fontWeight: 600 }}>Yapay Zeka Ajanlarımız (Multi-Agent System)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Tulpar */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--fg)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                      </div>
                      <strong style={{ color: 'var(--fg)', fontSize: '14.5px', fontWeight: 600 }}>Tulpar (Araştırma Ajanı)</strong>
                    </div>
                    <p style={{ margin: 0, paddingLeft: '38px', color: 'var(--fg-dim)' }}>
                      Efsanevi uçan at Tulpar gibi eşsiz bir hıza sahiptir. İnternetin derinliklerine dalarak Hepsiburada, Trendyol, YouTube ve Technopat/DonanımHaber gibi forumlardaki binlerce yorumu, video transkriptini ve şikayetleri saniyeler içinde toplar.
                    </p>
                  </div>

                  {/* Kam */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--fg)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      </div>
                      <strong style={{ color: 'var(--fg)', fontSize: '14.5px', fontWeight: 600 }}>Kam (Röntgen & Görsel Doğrulama)</strong>
                    </div>
                    <p style={{ margin: 0, paddingLeft: '38px', color: 'var(--fg-dim)' }}>
                      Şaman (Kam) gibi yüzeyin altındakini görür. Markanın kusursuz stüdyo görselleri ile son kullanıcıların evinde çektiği gerçek hayat karelerini "Radar Noktaları (Hotspots)" aracılığıyla milimetrik olarak eşleştirir. Malzeme kalitesi hilelerini ve yanıltıcı tasarımları deşifre eder.
                    </p>
                  </div>

                  {/* Bilge */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--fg)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>
                      </div>
                      <strong style={{ color: 'var(--fg)', fontSize: '14.5px', fontWeight: 600 }}>Bilge (Analiz ve Sentez Ajanı)</strong>
                    </div>
                    <p style={{ margin: 0, paddingLeft: '38px', color: 'var(--fg-dim)' }}>
                      Tulpar ve Kam'ın topladığı binlerce veriyi süzgeçten geçirir. Çelişkileri bulur, sahte övgüleri ayıklar ve ürünün gerçek "DNA"sını çıkararak tarafsız kategori skorları (Ses, Pil, Ekran vb.) oluşturur.
                    </p>
                  </div>

                  {/* Yargucu */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--fg)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
                      </div>
                      <strong style={{ color: 'var(--fg)', fontSize: '14.5px', fontWeight: 600 }}>Yargucu (Karar Mekanizması)</strong>
                    </div>
                    <p style={{ margin: 0, paddingLeft: '38px', color: 'var(--fg-dim)' }}>
                      Adaleti temsil eden Yargucu, tüm bu nesnel verileri <strong>sizin kişisel kullanım profilinizle</strong> (bütçeniz, kullanım amacınız) tartarak size "NET AL", "KOŞULLU" veya "OLUMSUZ" şeklinde kişiselleştirilmiş nihai bir karar sunar.
                    </p>
                  </div>

                  {/* Erlik */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--fg)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                      </div>
                      <strong style={{ color: 'var(--fg)', fontSize: '14.5px', fontWeight: 600 }}>Erlik (Şeytanın Avukatı)</strong>
                    </div>
                    <p style={{ margin: 0, paddingLeft: '38px', color: 'var(--fg-dim)' }}>
                      Yeraltı tanrısı Erlik'ten ilham alan bu ajan, sistemin verdiği "Al" kararına acımasızca saldırır. Ürünün uzun vadeli kronik sorunlarını, gizlenmiş eksilerini ve fiyata değmeyecek zayıflıklarını yüzünüze vurarak kararınızı son bir kez zorlu bir testten geçirir.
                    </p>
                  </div>

                </div>
              </section>

            </div>

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setShowGuide(false)}>Anladım</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
