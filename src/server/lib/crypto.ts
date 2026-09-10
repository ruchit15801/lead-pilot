import crypto from "node:crypto";

const keys = new Map<string, number>();

export function rememberIdempotency(key: string, ttlMs = 24 * 60 * 60 * 1000) {
  const existing = keys.get(key);
  if (existing && existing > Date.now()) return { duplicate: true };
  keys.set(key, Date.now() + ttlMs);
  return { duplicate: false };
}

export function makeIdempotencyKey(parts: Array<string | number | undefined>) {
  return crypto.createHash("sha256").update(parts.filter(Boolean).join("|")).digest("hex");
}

export function hmacSha256(body: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export function timingSafeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}
