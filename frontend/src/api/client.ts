import type { CatalogResponse, ConfigResponse, SearchPlacesCategory, SearchResponse } from './generated/model';
export type { Place, CatalogResponse, ConfigResponse, SearchPlacesCategory, SearchResponse } from './generated/model';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 모든 API 호출의 단일 경로. orval 생성 함수(mutator)와 request() 가 함께 쓴다:
 * 4xx/5xx 는 서버의 detail 문구로 ApiError 를 던져 react-query 의 isError 로 이어진다.
 */
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const detail = typeof body === 'object' && body !== null && 'detail' in body && typeof body.detail === 'string'
      ? body.detail
      : `HTTP ${response.status}`;
    throw new ApiError(detail, response.status);
  }
  if ([204, 205, 304].includes(response.status)) return null as T;
  return response.json() as Promise<T>;
}

export const request = <T>(path: string, signal?: AbortSignal) => apiFetch<T>(path, { signal });

export const getConfig = (signal?: AbortSignal) => request<ConfigResponse>('/api/config', signal);
export const getCatalog = (region: string, query: string, signal?: AbortSignal) => {
  const params = new URLSearchParams({ region, query });
  return request<CatalogResponse>(`/api/travel/catalog?${params}`, signal);
};
export const searchPlaces = (query: string, category: SearchPlacesCategory | null, signal?: AbortSignal) => {
  const params = new URLSearchParams({ query });
  if (category) params.set('category', category);
  return request<SearchResponse>(`/api/travel/search?${params}`, signal);
};
