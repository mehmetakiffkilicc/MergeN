const KEY = 'mergen_history';

export function loadHistory() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(product) {
  const items = loadHistory();
  const now = new Date();
  const id = `h-${Date.now()}`;

  const entry = {
    id,
    threadId: product.id || null,
    name: product.name || 'Bilinmeyen Ürün',
    category: product.category || '',
    image: product.image || '',
    query: product.name || '',
    whenAbs: now.toISOString(),
    bucket: 'today',
    pinned: false,
    trustScore: product.trustScore ?? 0,
    signals: (() => {
      const revSigs = product.reviewers
        ? product.reviewers.reduce((acc, r) => acc + (r.signals ? r.signals.filter(s => s.kind !== 'good').length : 0), 0)
        : 0;
      const claimSigs = product.claims
        ? product.claims.filter(c => c.severity === 'bad' || c.severity === 'warn' || c.score < 50).length
        : 0;
      const conflictSigs = product.crossSourceConflicts ? product.crossSourceConflicts.length : 0;
      const dnaSigs = product.dna ? product.dna.filter(d => d.value > 30).length : 0;
      const total = revSigs + claimSigs + conflictSigs + dnaSigs;
      return total > 0 ? total : (product.signals || 0);
    })(),
    sources: {
      reviews: (product.sources?.trendyolReviews || 0) + (product.sources?.hepsiburadaReviews || 0),
      forum: product.sources?.forum || product.sources?.forumPosts || 0,
      video: product.sources?.video || product.sources?.youtubeVideos || 0,
    },
    decision: product.decision?.badge || '',
    decisionTier: product.decision?.tier || 'warn',
    matchScore: product.matchScore ?? product.decision?.score ?? 0,
    headline: product.decision?.summary?.slice(0, 75) || product.decision?.rationale?.slice(0, 75) || '',
    runtime: '',
    current: false,
  };

  const filtered = items.filter(i => i.name !== entry.name);
  filtered.unshift(entry);

  const trimmed = filtered.slice(0, 50);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // storage full — drop oldest
    localStorage.setItem(KEY, JSON.stringify(trimmed.slice(0, 20)));
  }
  return trimmed;
}

export function togglePin(id) {
  const items = loadHistory();
  const updated = items.map(i => i.id === id ? { ...i, pinned: !i.pinned } : i);
  try {
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function deleteFromHistory(id) {
  const items = loadHistory();
  const updated = items.filter(i => i.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function clearHistory() {
  localStorage.removeItem(KEY);
}
