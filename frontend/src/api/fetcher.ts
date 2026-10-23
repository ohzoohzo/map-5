export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * orval 생성 함수·훅이 쓰는 fetch (#15). 4xx/5xx 는 ApiError 로 던져 react-query 의 isError 가 동작하게 한다.
 * 화면에서 직접 부를 때는 client.ts 의 request() 와 같다.
 */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const detail = typeof body === 'object' && body !== null && 'detail' in body && typeof body.detail === 'string'
      ? body.detail
      : `HTTP ${response.status}`;
    throw new ApiError(detail, response.status);
  }
  return ([204, 205, 304].includes(response.status) ? null : await response.json()) as T;
}
