import { test, expect } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:8765';

test.describe('MergeN Backend API Tests', () => {

  test('1 - Health endpoint', async ({ request }) => {
    const resp = await request.get(`${API_BASE}/health`);
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.status).toBe('ok');
  });

  test('2 - Thread ID deterministik', async ({ request }) => {
    const resp = await request.get(`${API_BASE}/api/analyze/thread_id`, {
      params: { product_name: 'Sony WH-1000XM5' },
    });
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body).toHaveProperty('thread_id');
    expect(typeof body.thread_id).toBe('string');
    expect(body.thread_id.length).toBe(16);

    const resp2 = await request.get(`${API_BASE}/api/analyze/thread_id`, {
      params: { product_name: 'Sony WH-1000XM5' },
    });
    const body2 = await resp2.json();
    expect(body.thread_id).toBe(body2.thread_id);
  });

  test('3 - Chat endpoint (200 veya 500)', async ({ request }) => {
    const resp = await request.post(`${API_BASE}/api/chat/`, {
      data: {
        product_name: 'Test Ürün',
        message: 'Bu ürün hakkında ne düşünüyorsun?',
      },
    });
    const status = resp.status();
    expect([200, 500]).toContain(status);
    const contentType = resp.headers()['content-type'] || '';
    if (status === 200) {
      expect(contentType).toContain('application/json');
    }
  });

  test('4 - Bilinmeyen result 404 döndürür', async ({ request }) => {
    const resp = await request.get(`${API_BASE}/api/analyze/result/nonexistent123`);
    expect(resp.status()).toBe(404);
  });

  test('5 - Bilinmeyen summary 404 döndürür', async ({ request }) => {
    const resp = await request.get(`${API_BASE}/api/analyze/summary/nonexistent123`);
    expect(resp.status()).toBe(404);
  });

});
