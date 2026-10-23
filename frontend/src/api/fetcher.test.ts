import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from './fetcher';
import { getCatalog } from './generated/travel/travel';

afterEach(() => vi.unstubAllGlobals());

describe('apiFetch (#15)', () => {
  it('throws ApiError with the server detail on 4xx/5xx, including generated functions', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ detail: '관광 데이터 형식이 올바르지 않아요.' }), { status: 503 })));
    await expect(getCatalog({ region: '부산광역시' })).rejects.toEqual(new ApiError('관광 데이터 형식이 올바르지 않아요.', 503));
  });

  it('falls back to the status when the error body has no detail, and returns data on 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>bad gateway</html>', { status: 502 })));
    await expect(apiFetch('/api/x')).rejects.toMatchObject({ status: 502, message: 'HTTP 502' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })));
    await expect(apiFetch('/api/x')).resolves.toEqual({ ok: true });
  });
});
