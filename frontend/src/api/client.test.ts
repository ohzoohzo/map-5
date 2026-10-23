import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCatalog } from './generated/travel/travel';
import { ApiError } from './client';

describe('generated API functions', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('throw ApiError with the server detail on 4xx/5xx instead of returning the error body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ detail: '관광 데이터가 아직 준비되지 않았어요.' }), { status: 503 })));
    const error = await getCatalog({ region: '', query: '' }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(503);
    expect((error as ApiError).message).toBe('관광 데이터가 아직 준비되지 않았어요.');
  });

  it('return the parsed body on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ places: [], total: 0 }), { status: 200 })));
    await expect(getCatalog({ region: '', query: '' })).resolves.toMatchObject({ total: 0 });
  });
});
