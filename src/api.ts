import { supabase } from './supabaseClient';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Authenticated call to the cafe API. Attaches the current Supabase access token,
 * parses JSON, and throws ApiError with the server's message on non-2xx responses.
 */
export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      ...init.headers,
    },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body && typeof body.error === 'string' ? body.error : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return body as T;
}

export const errorMessage = (err: unknown, fallback = 'Something went wrong.') =>
  err instanceof Error ? err.message : fallback;
