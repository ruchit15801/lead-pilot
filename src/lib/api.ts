export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.API_INTERNAL_URL ?? "http://localhost:3000";
};

const API_URL = getApiUrl();
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "axoryte-dev-key";

type Options = Omit<RequestInit, "body"> & { body?: unknown };

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("X-API-Key", API_KEY);
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isForm && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers,
    body: isForm
      ? (options.body as FormData)
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: { message?: string; code?: string } }
    | null;

  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload ? payload.error : undefined;
    throw new ApiError(error?.message ?? `Request failed (${response.status})`, response.status, error?.code);
  }

  return payload as T;
}

export function healthUrl() {
  return `${API_URL}/api/v1/health`;
}
