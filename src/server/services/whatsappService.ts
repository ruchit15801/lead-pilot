import QRCode from "qrcode";
import { WHATSAPP_LIMITS, WhatsAppRateLimiter } from "../domain/rateLimit";
import { AppError, NotFoundError, RateLimitError } from "../lib/errors";
import { hmacSha256, timingSafeEqual } from "../lib/crypto";
import { withRetry } from "../lib/retry";
import { loadDb, mutate, newId, nowIso } from "../store/fileStore";

const limiter = new WhatsAppRateLimiter();

export async function createSession(name: string) {
  return mutate(async (db) => {
    const session = {
      id: newId(),
      name: name || "Axoryte outreach",
      status: "qr" as const,
      sentToday: 0,
      sentTodayDate: new Date().toISOString().slice(0, 10),
      qrImage: await buildQr(newId()),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.sessions.unshift(session);
    return session;
  });
}

export async function getDefaultSession() {
  const db = await loadDb();
  if (db.sessions[0]) return db.sessions[0];
  return createSession("Axoryte outreach");
}

export async function getQr(sessionId: string) {
  return mutate(async (db) => {
    const session = db.sessions.find((item) => item.id === sessionId);
    if (!session) throw new NotFoundError("WhatsApp session", sessionId);
    if (session.status === "connected") {
      return { qrImage: null, status: session.status };
    }
    session.status = "qr";
    session.qrImage = await buildQr(session.id);
    session.updatedAt = nowIso();
    return { qrImage: session.qrImage, status: session.status };
  });
}

export async function sandboxConnect(sessionId: string) {
  return mutate((db) => {
    const session = db.sessions.find((item) => item.id === sessionId);
    if (!session) throw new NotFoundError("WhatsApp session", sessionId);
    session.status = "connected";
    session.qrImage = undefined;
    session.updatedAt = nowIso();
    db.activities.unshift({
      id: newId(),
      type: "system",
      text: "WhatsApp session OK",
      createdAt: nowIso(),
    });
    return session;
  });
}

export async function sendWhatsApp(input: {
  sessionId: string;
  chatId: string;
  text: string;
  idempotencyKey: string;
}) {
  const db = await loadDb();
  const session = db.sessions.find((item) => item.id === input.sessionId) ?? db.sessions[0];
  if (!session) throw new NotFoundError("WhatsApp session", input.sessionId);

  const today = new Date().toISOString().slice(0, 10);
  const sentToday = session.sentTodayDate === today ? session.sentToday : 0;
  const gate = limiter.canSend(sentToday);
  if (!gate.ok) throw new RateLimitError(gate.retryAfterMs, gate.reason);

  const openwaUrl = process.env.OPENWA_URL;
  if (openwaUrl && session.status === "connected") {
    await withRetry(async () => {
      const response = await fetch(`${openwaUrl.replace(/\/$/, "")}/sendText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: input.chatId, text: input.text }),
      });
      if (!response.ok) throw new AppError(`OpenWA send failed (${response.status})`, "WHATSAPP_SEND_FAILED", 502);
    });
  } else if (session.status !== "connected" && process.env.SANDBOX_MODE === "false") {
    throw new AppError("WhatsApp is not connected", "WHATSAPP_DISCONNECTED", 409);
  }

  limiter.record();
  await mutate((store) => {
    const current = store.sessions.find((item) => item.id === session.id);
    if (!current) return;
    const day = new Date().toISOString().slice(0, 10);
    if (current.sentTodayDate !== day) {
      current.sentToday = 0;
      current.sentTodayDate = day;
    }
    current.sentToday += 1;
    current.updatedAt = nowIso();
  });

  return { messageId: newId(), status: "sent" as const, provider: openwaUrl ? "openwa" : "sandbox" };
}

export function whatsappUsage() {
  return getDefaultSession().then(async (session) => {
    const today = new Date().toISOString().slice(0, 10);
    const sentToday = session.sentTodayDate === today ? session.sentToday : 0;
    return {
      session,
      limits: WHATSAPP_LIMITS,
      sentToday,
    };
  });
}

export function verifyWebhookSignature(rawBody: string, signature?: string | string[]) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true;
  const value = Array.isArray(signature) ? signature[0] : signature;
  if (!value) return false;
  return timingSafeEqual(hmacSha256(rawBody, secret), value.replace(/^sha256=/, ""));
}

async function buildQr(seed: string) {
  const payload = process.env.OPENWA_QR_PAYLOAD ?? `axoryte-openwa:${seed}`;
  return QRCode.toDataURL(payload, { margin: 1, width: 280 });
}
