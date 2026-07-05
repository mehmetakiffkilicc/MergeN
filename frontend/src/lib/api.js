const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

async function* parseSse(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    const parts = buffer.split('\n\n');
    buffer = parts.pop();
    for (const part of parts) {
      if (!part.trim()) continue;
      const lines = part.split('\n');
      let eventType = 'message';
      let data = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) eventType = line.slice(7).trim();
        else if (line.startsWith('data: ')) data = line.slice(6).trim();
      }
      if (data) {
        try { yield { type: eventType, ...JSON.parse(data) }; }
        catch { yield { type: eventType, raw: data }; }
      }
    }
  }
}

export function streamAnalysis(query, onEvent) {
  const productName = typeof query === 'string' ? query : (query.productName || query);
  const productUrl  = typeof query === 'object' ? (query.productUrl || null) : null;
  let cancelled = false;
  const controller = new AbortController();
  let retryCount = 0;
  const maxRetries = 3;

  const attempt = async () => {
    try {
      const response = await fetch(`${BASE}/api/analyze/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_name: productName, product_url: productUrl }),
        signal: controller.signal,
      });
      if (!response.ok) {
        onEvent({ type: 'error', message: `HTTP ${response.status}` });
        return;
      }
      for await (const event of parseSse(response)) {
        if (cancelled) break;
        onEvent(event);
        if (event.type === 'done' || event.type === 'error') break;
      }
    } catch (err) {
      if (!cancelled) {
        const isConnErr = err.name === 'TypeError' && err.message === 'Failed to fetch';
        
        if (isConnErr && retryCount < maxRetries) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          await attempt();
          return;
        }

        const msg = isConnErr
          ? `Backend'e ulaşılamıyor — sunucu çalışıyor mu? (${BASE})`
          : err.message;
        onEvent({ type: 'error', message: msg });
      }
    }
  };

  attempt();
  return () => { cancelled = true; controller.abort(); };
}

export async function sendAnswers(threadId, answers) {
  const response = await fetch(`${BASE}/api/analyze/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thread_id: threadId, answers }),
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  for await (const event of parseSse(response)) {
    if (event.type === 'done') break;
    if (event.type === 'error') throw new Error(event.message || 'Pipeline hatası');
  }
}

export async function getAnalysisResult(threadId) {
  const r = await fetch(`${BASE}/api/analyze/result/${threadId}`);
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

export async function sendChat({ productName, message, threadId }) {
  const r = await fetch(`${BASE}/api/chat/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_name: productName, message, thread_id: threadId || null }),
  });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

export async function getAnalysisSummary(threadId) {
  const r = await fetch(`${BASE}/api/analyze/summary/${threadId}`);
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

export const api = { streamAnalysis, sendAnswers, getAnalysisResult, sendChat, getAnalysisSummary };
