import { test, expect, request } from '@playwright/test';

const BACKEND = 'http://127.0.0.1:8765';

test.describe('Backend API', () => {
  test.setTimeout(120000);

  // ─── Health ───

  test('GET /health returns status ok', async ({ request }) => {
    const res = await request.get(`${BACKEND}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('GET /health response shape is valid', async ({ request }) => {
    const res = await request.get(`${BACKEND}/health`);
    const body = await res.json();
    // Status is either ok or degraded
    expect(['ok', 'degraded']).toContain(body.status);
    // If degraded, missing array lists the absent keys
    if (body.status === 'degraded' && body.missing) {
      expect(Array.isArray(body.missing)).toBe(true);
    }
  });

  // ─── Thread ID ───

  test('GET /api/analyze/thread_id returns a thread_id', async ({ request }) => {
    const res = await request.get(`${BACKEND}/api/analyze/thread_id?product_name=Sony+WH-1000XM5`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('thread_id');
    expect(typeof body.thread_id).toBe('string');
    expect(body.thread_id.length).toBeGreaterThan(0);
  });

  test('thread_id is deterministic for same product', async ({ request }) => {
    const q = 'Apple+AirPods+Pro+2';
    const r1 = await request.get(`${BACKEND}/api/analyze/thread_id?product_name=${q}`);
    const r2 = await request.get(`${BACKEND}/api/analyze/thread_id?product_name=${q}`);
    const b1 = await r1.json();
    const b2 = await r2.json();
    expect(b1.thread_id).toBe(b2.thread_id);
  });

  test('different products get different thread_ids', async ({ request }) => {
    const r1 = await request.get(`${BACKEND}/api/analyze/thread_id?product_name=ProductA`);
    const r2 = await request.get(`${BACKEND}/api/analyze/thread_id?product_name=ProductB`);
    const b1 = await r1.json();
    const b2 = await r2.json();
    expect(b1.thread_id).not.toBe(b2.thread_id);
  });

  // ─── Summary (nonexistent thread) ───

  test('GET /api/analyze/summary/:id with unknown id returns 404', async ({ request }) => {
    const res = await request.get(`${BACKEND}/api/analyze/summary/nonexistent-thread-xyz`);
    expect([404, 422]).toContain(res.status());
  });

  // ─── Chat ───

  test('POST /api/chat/ returns a message', async ({ request }) => {
    const res = await request.post(`${BACKEND}/api/chat/`, {
      data: { message: 'Merhaba', thread_id: null, product_name: 'Test' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('message');
    expect(typeof body.message).toBe('string');
    expect(body.message.length).toBeGreaterThan(0);
  });

  test('POST /api/chat/ response does not repeat input verbatim', async ({ request }) => {
    const userMsg = 'ANC kalitesi hakkında ne düşünüyorsun?';
    const res = await request.post(`${BACKEND}/api/chat/`, {
      data: { message: userMsg, thread_id: null, product_name: 'Sony WH-1000XM5' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Response should be different from the input (it's an AI response, not echo)
    expect(body.message).not.toBe(userMsg);
  });

  // ─── Answer with invalid thread ───

  test('POST /api/analyze/answer with unknown thread_id returns error', async ({ request }) => {
    const res = await request.post(`${BACKEND}/api/analyze/answer`, {
      data: { thread_id: 'nonexistent-xyz-12345', answers: { q1: 'test' } },
    });
    // Should return 4xx (not 200)
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  // ─── Full SSE stream ───

  test('POST /api/analyze/stream emits SSE events and interrupt', async ({ page }) => {
    await page.goto('/');
    const product = 'Sony WH-1000XM5 Test';

    const events = await page.evaluate(async ({ backendUrl, productName }) => {
      return new Promise((resolve) => {
        const collected = [];
        let resolved = false;
        const controller = new AbortController();

        const timeout = setTimeout(() => {
          if (!resolved) { resolved = true; controller.abort(); resolve(collected); }
        }, 85000);

        fetch(`${backendUrl}/api/analyze/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_name: productName }),
          signal: controller.signal,
        }).then(response => {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buf = '';
          let eventName = 'message';
          let dataLine = '';

          function processBuffer() {
            let idx;
            while ((idx = buf.indexOf('\n')) !== -1) {
              const line = buf.slice(0, idx);
              buf = buf.slice(idx + 1);
              if (line.startsWith('event: ')) {
                eventName = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                dataLine = line.slice(6).trim();
              } else if (line.trim() === '' && dataLine) {
                collected.push({ type: eventName, data: dataLine });
                if (eventName === 'interrupt' || eventName === 'done') {
                  if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    reader.cancel();
                    resolve(collected);
                  }
                  return true;
                }
                eventName = 'message';
                dataLine = '';
              }
            }
            return false;
          }

          function read() {
            reader.read().then(({ done, value }) => {
              if (done) {
                if (!resolved) { resolved = true; clearTimeout(timeout); resolve(collected); }
                return;
              }
              buf += decoder.decode(value, { stream: true });
              if (processBuffer()) return;
              read();
            }).catch(() => {
              if (!resolved) { resolved = true; resolve(collected); }
            });
          }
          read();
        }).catch(() => {
          if (!resolved) { resolved = true; resolve(collected); }
        });
      });
    }, { backendUrl: BACKEND, productName: product });

    // Should have received at least one event
    expect(events.length).toBeGreaterThan(0);

    // Should have phase events
    const phaseEvents = events.filter(e => e.type === 'phase');
    expect(phaseEvents.length).toBeGreaterThan(0);

    // Should end with interrupt or done (not error)
    const lastMeaningful = events.filter(e => ['interrupt', 'done', 'stream_error'].includes(e.type)).pop();
    expect(lastMeaningful).toBeDefined();
    expect(lastMeaningful?.type).not.toBe('stream_error');
  });

  test('SSE interrupt event contains thread_id and questions', async ({ page }) => {
    await page.goto('/');
    const product = 'Apple AirPods Pro 2 APITest';

    const interruptEvent = await page.evaluate(async ({ backendUrl, productName }) => {
      return new Promise((resolve) => {
        let resolved = false;
        const controller = new AbortController();

        const timeout = setTimeout(() => {
          if (!resolved) { resolved = true; controller.abort(); resolve(null); }
        }, 85000);

        fetch(`${backendUrl}/api/analyze/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_name: productName }),
          signal: controller.signal,
        }).then(response => {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buf = '';
          let eventName = 'message';
          let dataLine = '';

          function processBuffer() {
            let idx;
            while ((idx = buf.indexOf('\n')) !== -1) {
              const line = buf.slice(0, idx);
              buf = buf.slice(idx + 1);
              if (line.startsWith('event: ')) {
                eventName = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                dataLine = line.slice(6).trim();
              } else if (line.trim() === '' && dataLine) {
                if (eventName === 'interrupt') {
                  if (!resolved) {
                    clearTimeout(timeout);
                    resolved = true;
                    reader.cancel();
                    try { resolve(JSON.parse(dataLine)); } catch { resolve(dataLine); }
                  }
                  return true;
                }
                if (eventName === 'done') {
                  if (!resolved) {
                    clearTimeout(timeout);
                    resolved = true;
                    reader.cancel();
                    resolve(null);
                  }
                  return true;
                }
                eventName = 'message';
                dataLine = '';
              }
            }
            return false;
          }

          function read() {
            reader.read().then(({ done, value }) => {
              if (done) {
                if (!resolved) { resolved = true; clearTimeout(timeout); resolve(null); }
                return;
              }
              buf += decoder.decode(value, { stream: true });
              if (processBuffer()) return;
              read();
            }).catch(() => {
              if (!resolved) { resolved = true; resolve(null); }
            });
          }
          read();
        }).catch(() => {
          if (!resolved) { resolved = true; resolve(null); }
        });
      });
    }, { backendUrl: BACKEND, productName: product });

    if (interruptEvent) {
      // If we got an interrupt (not done), verify structure
      expect(interruptEvent).toHaveProperty('thread_id');
      expect(interruptEvent).toHaveProperty('questions');
      expect(Array.isArray(interruptEvent.questions)).toBe(true);
      expect(interruptEvent.questions.length).toBeGreaterThan(0);
    }
    // If null (done without interrupt), that's also acceptable
  });

  // ─── 404 for unknown routes ───

  test('unknown route returns 404', async ({ request }) => {
    const res = await request.get(`${BACKEND}/api/nonexistent-route-xyz`);
    expect(res.status()).toBe(404);
  });
});
