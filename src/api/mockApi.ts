import { MOCKAPI_BASE_URL } from '../config';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.status = status;
  }
}

const TIMEOUT_MS = 10000;

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${MOCKAPI_BASE_URL.replace(/\/$/, '')}/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new ApiError(res.status);
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** REST client cho MockAPI. `resource` là tên resource, ví dụ BIT247895_Dish. */
export const mockApi = {
  list: <T>(resource: string) => request<T[]>('GET', resource),
  create: <T>(resource: string, body: unknown) => request<T>('POST', resource, body),
  update: <T>(resource: string, id: string, body: unknown) => request<T>('PUT', `${resource}/${id}`, body),
  remove: (resource: string, id: string) => request<unknown>('DELETE', `${resource}/${id}`),
};
