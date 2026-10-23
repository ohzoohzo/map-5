import type { CatalogResponse, ConfigResponse, SearchPlacesCategory, SearchResponse } from './generated/model';
export type { Place, CatalogResponse, ConfigResponse, SearchPlacesCategory, SearchResponse } from './generated/model';

import { apiFetch } from './fetcher';
export { ApiError } from './fetcher';

/** 화면에서 직접 부르는 요청. 생성 훅과 같은 apiFetch 라 4xx/5xx 는 ApiError 로 던진다. */
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
