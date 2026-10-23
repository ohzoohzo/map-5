import type { CatalogResponse, ConfigResponse, SearchPlacesCategory, SearchResponse } from './generated/model';
export type { Place, CatalogResponse, ConfigResponse, SearchPlacesCategory, SearchResponse } from './generated/model';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const detail = typeof body === 'object' && body !== null && 'detail' in body && typeof body.detail === 'string'
      ? body.detail
      : `HTTP ${response.status}`;
    throw new ApiError(detail, response.status);
  }
  return response.json() as Promise<T>;
}

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
