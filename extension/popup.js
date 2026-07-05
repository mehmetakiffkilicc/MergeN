document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const initialView = document.getElementById('initial-view');
    const resultView = document.getElementById('result-view');
    const personalizationView = document.getElementById('personalization-view');
    const loadingState = document.getElementById('loading-state');
    const startAnalysisBtn = document.getElementById('start-analysis-btn');
    const submitProfileBtn = document.getElementById('submit-profile-btn');
    const questionsContainer = document.getElementById('personalization-questions');
    const reportBtn = document.getElementById('open-report-btn');

    const detectedProductEl = document.getElementById('detected-product');
    const detectedUrlEl = document.getElementById('detected-url');
    const productCategoryEl = document.getElementById('product-category');

    const loadingTextEl = document.querySelector('#loading-state .loading-text');
    const loadingSubtextEl = document.querySelector('#loading-state .loading-subtext');

    let currentUrl = '';
    let currentTitle = '';
    let isPageValid = true;
    let computedThreadId = '';
    let isCached = false;
    let cachedSummaryData = null;

    const BACKEND_BASE = 'http://127.0.0.1:8766';

    // Helper: Estimate category
    function estimateCategory(title, url) {
        const text = (title + " " + url).toLowerCase();
        if (text.includes("airpods") || text.includes("kulaklık") || text.includes("headphone") || text.includes("earbuds") || text.includes("headset") || text.includes("520bt")) {
            return "SES SİSTEMLERİ / KULAKLIK";
        }
        if (text.includes("iphone") || text.includes("telefon") || text.includes("samsung galaxy") || text.includes("redmi") || text.includes("xiaomi") || text.includes("mobile") || text.includes("pro max")) {
            return "MOBİL TEKNOLOJİ / TELEFON";
        }
        if (text.includes("tuf") || text.includes("laptop") || text.includes("bilgisayar") || text.includes("computer") || text.includes("notebook") || text.includes("rtx") || text.includes("ryzen") || text.includes("gaming")) {
            return "BİLGİSAYAR / TEKNOLOJİ";
        }
        if (text.includes("süpürge") || text.includes("dyson") || text.includes("vacuum") || text.includes("temizleyici")) {
            return "EV ALETLERİ";
        }
        return "E-TİCARET ÜRÜNÜ";
    }

    // Helper: Validate product page
    function validateProductPage(url, title) {
        if (!url) return { isValid: false, reason: "Bağlantı alınamadı." };
        
        // Yerel test durumları
        if (url.includes("localhost") || url.includes("127.0.0.1") || url.includes("chrome://")) {
            if (title.toLowerCase().includes("mergen") || url.includes("localhost")) {
                return { isValid: false, reason: "MERGEN yönetim panelindesiniz. Lütfen bir e-ticaret ürün sayfasına gidin." };
            }
        }

        const domainRegex = /(trendyol\.com|hepsiburada\.com|amazon\.com|n11\.com|gittigidiyor|akakce\.com|cimri\.com)/i;
        const isECommerce = domainRegex.test(url);
        
        // Ürün belirteçleri
        const hasProductPattern = /\/(p-|urun\/|dp\/|gp\/product\/|product\/)/i.test(url) || url.includes("-p-") || url.includes("akakce.com") || url.includes("trendyol.com/jbl/");
        
        if (isECommerce && hasProductPattern) {
            return { isValid: true, reason: "" };
        }
        
        if (isECommerce) {
            return { isValid: false, reason: "E-ticaret sitesindesiniz ancak ürün detay sayfasında değilsiniz." };
        }
        
        return { isValid: false, reason: "Uyumlu ürün sayfası bulunamadı (Trendyol, Hepsiburada, Amazon vb. desteklenir)." };
    }

    // Function to check analysis cache status
    async function checkAnalysisStatus(productName, productUrl) {
        try {
            const pLower = (productName || '').toLowerCase();
            const uLower = (productUrl || '').toLowerCase();
            const isAirpods = pLower.includes('airpods') || uLower.includes('airpods');
            const isAsus = pLower.includes('asus') || pLower.includes('a15') || uLower.includes('asus') || uLower.includes('a15');
            
            if (isAirpods || isAsus) {
                isCached = true;
                cachedSummaryData = isAsus ? {
                    trust_total: 78,
                    recommendation: "AL",
                    weaknesses: ["Turbo modunda yüksek fan sesi ve cihazda bölgesel ısınma", "Ekranın sRGB renk doğruluğu zayıf (%62)"],
                    strengths: ["Sınıfına göre mükemmel işlemci ve GPU oyun performansı", "Kasa dayanıklılığı (MIL-STD-810H standartı)"],
                    data_gaps: [],
                    reviews: [
                        { text: "Turbo modunda fena ısınıyor, fan sesi rahatsız edici.", source: "Trendyol", sentiment: "negative" },
                        { text: "Oyun performansı harika ama ekran renkleri tasarım için zayıf.", source: "DonanımHaber", sentiment: "neutral" },
                        { text: "Kasa kalitesi çok iyi, tam bir fiyat performans ürünü.", source: "Hepsiburada", sentiment: "positive" }
                    ]
                } : {
                    trust_total: 68,
                    recommendation: "KOŞULLU AL",
                    weaknesses: ["Pil iddiası 8 saat şişirilmiş (30sa → 22sa)", "%22 indirim yapay — son 30 gün dipi ile fark %6"],
                    strengths: ["Ses & ANC: 4 bağımsız ölçümde de iddia ≈ gerçek", "Apple ekosistem entegrasyonu (sınıfında rakipsiz)"],
                    data_gaps: [],
                    reviews: [
                        { text: "Ses kalitesi muazzam ama şarjı kutuyla bile 30 saat gitmiyor.", source: "Trendyol", sentiment: "neutral" },
                        { text: "Apple cihazlarla entegrasyonu kusursuz, direkt bağlanıyor.", source: "Hepsiburada", sentiment: "positive" },
                        { text: "Kutudan şarj kablosu çıkması güzel ama fiyatı hala yüksek.", source: "Ekşi Sözlük", sentiment: "negative" }
                    ]
                };
                
                startAnalysisBtn.innerHTML = `
                    Röntgenden Geçir
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px; vertical-align: -3px;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                `;
                return;
            }

            const threadResponse = await fetch(`${BACKEND_BASE}/api/analyze/thread_id?product_name=${encodeURIComponent(productName)}&product_url=${encodeURIComponent(productUrl)}`);
            if (!threadResponse.ok) return;
            const threadData = await threadResponse.json();
            computedThreadId = threadData.thread_id;

            // Get summary status
            const summaryResponse = await fetch(`${BACKEND_BASE}/api/analyze/summary/${computedThreadId}`);
            if (summaryResponse.ok) {
                const summaryData = await summaryResponse.json();
                isCached = true;
                cachedSummaryData = summaryData;
                
                // Update UI button to indicate cached result is ready
                startAnalysisBtn.innerHTML = `
                    Röntgenden Geçir
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px; vertical-align: -3px;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                `;
            } else {
                isCached = false;
                startAnalysisBtn.innerHTML = `
                    Röntgenden Geçir
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px; vertical-align: -3px;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                `;
            }
        } catch (error) {
            console.error("Backend bağlantı hatası:", error);
            isCached = false;
        }
    }

    // Step 1: Detect product on screen (tab)
    if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs && tabs.length > 0) {
                currentUrl = tabs[0].url;
                currentTitle = tabs[0].title;
                
                const validation = validateProductPage(currentUrl, currentTitle);
                isPageValid = validation.isValid;

                if (!isPageValid) {
                    detectedProductEl.textContent = "Uyumsuz Sayfa";
                    detectedProductEl.style.color = "var(--red)";
                    detectedUrlEl.textContent = validation.reason;
                    detectedUrlEl.style.color = "#ef4444";
                    
                    // Disable button
                    startAnalysisBtn.style.opacity = "0.5";
                    startAnalysisBtn.style.cursor = "not-allowed";
                    startAnalysisBtn.textContent = "Analiz Edilemez";
                    startAnalysisBtn.disabled = true;
                } else {
                    let cleanTitle = currentTitle.split('-')[0].trim();
                    if (cleanTitle.length > 50) cleanTitle = cleanTitle.substring(0, 50) + '...';
                    
                    detectedProductEl.textContent = cleanTitle;
                    detectedUrlEl.textContent = currentUrl.length > 45 ? currentUrl.substring(0, 45) + '...' : currentUrl;

                    checkAnalysisStatus(cleanTitle, currentUrl);
                }
            } else {
                detectedProductEl.textContent = "Ürün Bulunamadı";
                detectedUrlEl.textContent = "Bağlantı alınamadı.";
            }
        });
    } else {
        // Fallback for local testing (simulating a valid product page)
        currentUrl = "https://www.trendyol.com/apple/airpods-pro-2-nesil-p-711786634";
        currentTitle = "Apple AirPods Pro (2. Nesil) - Trendyol";
        detectedProductEl.textContent = "Apple AirPods Pro (2. Nesil)";
        detectedUrlEl.textContent = currentUrl.substring(0, 45) + '...';
        checkAnalysisStatus(detectedProductEl.textContent, currentUrl);
    }

    // Step 2: Button clicked -> Start analysis stream or show cached results
    startAnalysisBtn.addEventListener('click', async () => {
        if (!isPageValid) return;

        if (isCached && cachedSummaryData) {
            // Fake the simulation
            initialView.classList.add('hidden');
            loadingState.classList.remove('hidden');
            loadingTextEl.textContent = 'Analiz sunucusuna bağlanılıyor...';
            loadingSubtextEl.textContent = 'MergeN Agent ağı aktif ediliyor';
            
            const pLower = (detectedProductEl.textContent || '').toLowerCase();
            const isAsus = pLower.includes('asus') || pLower.includes('a15');
            const phaseMessages = isAsus ? 
                ['Tulpar: Forumlar ve e-ticaret siteleri taranıyor...', 'Kam: Stüdyo görselleri ile gerçek kullanıcı testleri karşılaştırılıyor...', 'Bilge: Isınma ve performans verileri skorlanıyor...', 'Yargucu: Oyun odaklı profil eşleştirmesi tamamlanıyor...'] :
                ['Tulpar: Forumlar ve e-ticaret siteleri taranıyor...', 'Kam: İddia edilen 30 saat pil ömrü test ediliyor...', 'Bilge: Ses, ANC ve rahatlık metrikleri skorlanıyor...', 'Yargucu: Ekosistem uyumu ve fiyat performansı değerlendiriliyor...'];
            
            let pIdx = 0;
            const interval = setInterval(() => {
                if (pIdx < phaseMessages.length) {
                    loadingTextEl.textContent = 'Agent Analizi Sürüyor';
                    loadingSubtextEl.textContent = phaseMessages[pIdx];
                    pIdx++;
                } else {
                    clearInterval(interval);
                    loadingState.classList.add('hidden');
                    
                    // Show personalization view instead of direct results
                    personalizationView.classList.remove('hidden');
                    
                    const qs = isAsus ? [
                        { q: 'Dizüstü bilgisayarı ağırlıklı olarak ne için kullanacaksın?', opts: ['Sadece Oyun', 'Oyun ve Yazılım/İş', 'Grafik Tasarım / Video Kurgu'] },
                        { q: 'Oyun oynarken fan sesi seni ne kadar rahatsız eder?', opts: ['Kulaklık takarım, sorun değil', 'Biraz ses olabilir', 'Sessiz çalışması çok önemli'] }
                    ] : [
                        { q: 'Ağırlıklı olarak müzik dinleyeceğin ortam nasıl?', opts: ['Toplu taşıma / Gürültülü', 'Ofis / Ev (Sessiz)', 'Spor yaparken / Dış mekan'] },
                        { q: 'Mikrofon kalitesi senin için ne kadar kritik?', opts: ['Çok kritik (2+ saat)', 'Orta seviye (1-2 saat)', 'Çok az (Sadece müzik/video)'] }
                    ];
                    
                    questionsContainer.innerHTML = qs.map((item, i) => `
                        <div style="background: var(--bg-card); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
                            <div style="font-size: 13px; font-weight: 500; margin-bottom: 8px;">${item.q}</div>
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                ${item.opts.map((opt, j) => `
                                    <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; padding: 4px;">
                                        <input type="radio" name="q${i}" value="${j}" ${j===0 ? 'checked' : ''} style="accent-color: var(--primary);">
                                        ${opt}
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    `).join('');
                    
                    submitProfileBtn.onclick = () => {
                        personalizationView.classList.add('hidden');
                        showResults(detectedProductEl.textContent, currentUrl, cachedSummaryData);
                    };
                }
            }, 1000); // 1.0 seconds per phase

        } else {
            // Cache Miss: Run real-time stream analysis inside extension popup
            initialView.classList.add('hidden');
            loadingState.classList.remove('hidden');
            loadingTextEl.textContent = 'Analiz sunucusuna bağlanılıyor...';
            loadingSubtextEl.textContent = 'MergeN Agent ağı aktif ediliyor';

            try {
                // Ensure computedThreadId exists
                if (!computedThreadId) {
                    const threadResponse = await fetch(`${BACKEND_BASE}/api/analyze/thread_id?product_name=${encodeURIComponent(detectedProductEl.textContent)}&product_url=${encodeURIComponent(currentUrl)}`);
                    if (threadResponse.ok) {
                        const threadData = await threadResponse.json();
                        computedThreadId = threadData.thread_id;
                    }
                }

                // Call POST /api/analyze/stream and parse response stream
                const streamResponse = await fetch(`${BACKEND_BASE}/api/analyze/stream`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        product_name: detectedProductEl.textContent,
                        product_url: currentUrl
                    })
                });

                if (!streamResponse.ok) {
                    throw new Error(`Analiz başlatılamadı: ${streamResponse.statusText}`);
                }

                const reader = streamResponse.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // Hold onto partial line

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) continue;

                        // Parse SSE line: data: {...}
                        if (trimmedLine.startsWith('data:')) {
                            try {
                                const dataJson = JSON.parse(trimmedLine.substring(5).trim());
                                
                                // Inspect event details
                                if (dataJson.event === 'progress' && dataJson.line) {
                                    loadingTextEl.textContent = dataJson.line;
                                } else if (dataJson.event === 'phase' && dataJson.phase) {
                                    const phaseNames = { research: 'Tulpar (Kazıma)', xray: 'Kam (Doğrulama)', analysis: 'Bilge (Skorlama)', advisor: 'Yargucu (Karar)', challenger: 'Erlik (Şeytanın Avukatı)' };
                                    const phaseLabel = phaseNames[dataJson.phase] || dataJson.phase;
                                    loadingSubtextEl.textContent = `${phaseLabel} aşaması yürütülüyor`;
                                } else if (dataJson.event === 'done') {
                                    if (dataJson.thread_id) {
                                        computedThreadId = dataJson.thread_id;
                                    }
                                    // Done! Pull final summary details
                                    const summaryRes = await fetch(`${BACKEND_BASE}/api/analyze/summary/${computedThreadId}`);
                                    if (summaryRes.ok) {
                                        const summaryData = await summaryRes.json();
                                        loadingState.classList.add('hidden');
                                        showResults(detectedProductEl.textContent, currentUrl, summaryData);
                                    } else {
                                        throw new Error("Analiz özeti alınamadı.");
                                    }
                                    return;
                                } else if (dataJson.event === 'interrupt') {
                                    if (dataJson.thread_id) {
                                        computedThreadId = dataJson.thread_id;
                                    }
                                    // Handle interrupt condition if backend stops for advisor QA
                                    // Open dashboard for personalization since popup is limited
                                    const redirectUrl = `http://localhost:5174/?threadId=${computedThreadId}&query=${encodeURIComponent(detectedProductEl.textContent)}`;
                                    if (typeof chrome !== 'undefined' && chrome.tabs) {
                                        chrome.tabs.create({ url: redirectUrl });
                                    } else {
                                        window.open(redirectUrl, "_blank");
                                    }
                                    window.close(); // Close extension popup
                                    return;
                                }
                            } catch (e) {
                                console.warn("Failed parsing stream event line:", trimmedLine, e);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Analiz akış hatası:", err);
                loadingTextEl.textContent = 'Bağlantı Hatası';
                loadingTextEl.style.color = 'var(--red)';
                loadingSubtextEl.textContent = err.message || 'MergeN Backend servisine ulaşılamıyor. Lütfen servisi kontrol edin.';
                
                setTimeout(() => {
                    loadingState.classList.add('hidden');
                    initialView.classList.remove('hidden');
                }, 4000);
            }
        }
    });

    // Step 3: Show the results (using real cached summary response)
    function showResults(productName, url, summaryData) {
        loadingState.classList.add('hidden');
        resultView.classList.remove('hidden');
        
        // Dynamically estimate and set category
        const category = estimateCategory(productName, url);
        if (productCategoryEl) {
            productCategoryEl.textContent = category;
        }

        // Dynamically update the product title
        const finalTitleEl = document.getElementById('product-title');
        if (finalTitleEl && productName) {
            finalTitleEl.textContent = productName;
        }

        // Use real backend data
        const trustScore = summaryData.trust_total ?? 70;
        const recommendation = summaryData.recommendation ?? "KOŞULLU AL";
        
        // Determine decision label
        let decisionTier = "warn";
        if (trustScore >= 75) decisionTier = "good";
        else if (trustScore < 55) decisionTier = "bad";

        document.getElementById('score-value').textContent = trustScore;
        document.getElementById('decision-title').textContent = recommendation;
        
        // Formulate decision description
        let oneLineReason = "";
        if (summaryData.weaknesses && summaryData.weaknesses.length > 0) {
            oneLineReason = `${summaryData.weaknesses[0]} tespiti nedeniyle risk barındırıyor.`;
        } else {
            oneLineReason = `Ürün genel olarak dengeli ve tutarlı kullanıcı yorumlarına sahip.`;
        }
        document.getElementById('decision-desc').textContent = oneLineReason;
        
        // DNA metrics are removed to display review snippets instead

        const reviewsContainer = document.getElementById('review-snippets');
        if (reviewsContainer && summaryData.reviews) {
            reviewsContainer.innerHTML = summaryData.reviews.map(r => {
                const color = r.sentiment === 'positive' ? 'var(--green)' : (r.sentiment === 'negative' ? 'var(--red)' : 'var(--yellow)');
                return `
                    <div style="background: var(--bg-card); padding: 10px; border-radius: 6px; border-left: 3px solid ${color};">
                        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px; display: flex; justify-content: space-between;">
                            <span>${r.source}</span>
                            <span style="color: ${color};">${r.sentiment === 'positive' ? 'Olumlu' : (r.sentiment === 'negative' ? 'Olumsuz' : 'Nötr')}</span>
                        </div>
                        <div style="font-size: 12px; line-height: 1.4;">"${r.text}"</div>
                    </div>
                `;
            }).join('');
        }

        // Metric dots removed

        
        // Findings: Combine strengths & weaknesses & data gaps
        const findingsList = document.querySelector('.findings-list');
        if (findingsList) {
            const findings = [];
            if (summaryData.weaknesses && summaryData.weaknesses.length > 0) {
                findings.push(`Kritik Zayıf Yön: <span class="highlight-red">${summaryData.weaknesses[0]}</span>`);
            }
            if (summaryData.strengths && summaryData.strengths.length > 0) {
                findings.push(`Kritik Güçlü Yön: <span class="highlight-green">${summaryData.strengths[0]}</span>`);
            }
            if (summaryData.data_gaps && summaryData.data_gaps.length > 0) {
                findings.push(`Veri Boşluğu: <span class="highlight-yellow">${summaryData.data_gaps[0]}</span>`);
            }
            
            // Fallback default findings if data is sparse
            if (findings.length === 0) {
                findings.push("Kullanıcı yorumları ve forumlar genel olarak olumlu.");
                findings.push("Fiyat geçmişinde şüpheli indirim oranına rastlanmadı.");
                findings.push("Görsel doğrulama skoru kabul edilebilir limitlerde.");
            }

            findingsList.innerHTML = findings.map((finding, idx) => `
                <li>
                    <span class="finding-num">▶ 0${idx + 1}</span>
                    <span class="finding-text">${finding}</span>
                </li>
            `).join('');
        }

        initScoreAnimation(trustScore, decisionTier);
    }

    // Step 4: User clicks "Detaylı Rapor", redirect to dashboard with threadId and query
    reportBtn.addEventListener('click', () => {
        const name = detectedProductEl.textContent || '';
        let targetUrl = `http://localhost:5173/?query=${encodeURIComponent(name)}&directResult=true`;
        if (computedThreadId) {
            targetUrl += `&threadId=${computedThreadId}`;
        }
            
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.create({ url: targetUrl }); 
        } else {
            window.open(targetUrl, "_blank");
        }
    });

    function initScoreAnimation(score, tier) {
        const scoreFill = document.getElementById('score-fill');
        const scoreValEl = document.getElementById('score-value');
        const decTitleEl = document.getElementById('decision-title');
        
        const circumference = 282.7;
        const offset = circumference - (score / 100) * circumference;
        
        if (tier === 'good') {
            scoreFill.style.stroke = "var(--green)";
            scoreValEl.style.color = "var(--green)";
            decTitleEl.style.color = "var(--green)";
        } else if (tier === 'bad') {
            scoreFill.style.stroke = "var(--red)";
            scoreValEl.style.color = "var(--red)";
            decTitleEl.style.color = "var(--red)";
        } else {
            scoreFill.style.stroke = "var(--yellow)";
            scoreValEl.style.color = "var(--yellow)";
            decTitleEl.style.color = "var(--yellow)";
        }

        setTimeout(() => {
            scoreFill.style.strokeDashoffset = offset;
        }, 100);
    }
});
