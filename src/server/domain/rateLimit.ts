export const WHATSAPP_LIMITS = {
  perMinute: 3,
  perHour: 40,
  perDay: 200,
};

export function sendIntervalSeconds(random: () => number = Math.random) {
  return 60 / WHATSAPP_LIMITS.perMinute + 5 + random() * 10;
}

export class WhatsAppRateLimiter {
  private minute: { windowStart: number; count: number } = { windowStart: 0, count: 0 };
  private hour: { windowStart: number; count: number } = { windowStart: 0, count: 0 };

  constructor(private readonly now: () => number = Date.now) {}

  canSend(sentToday: number): { ok: boolean; retryAfterMs: number; reason?: string } {
    const now = this.now();
    this.rotate(now);

    if (sentToday >= WHATSAPP_LIMITS.perDay) {
      return { ok: false, retryAfterMs: msUntilTomorrow(now), reason: "daily limit" };
    }
    if (this.minute.count >= WHATSAPP_LIMITS.perMinute) {
      return {
        ok: false,
        retryAfterMs: 60_000 - (now - this.minute.windowStart),
        reason: "per-minute limit",
      };
    }
    if (this.hour.count >= WHATSAPP_LIMITS.perHour) {
      return {
        ok: false,
        retryAfterMs: 3_600_000 - (now - this.hour.windowStart),
        reason: "hourly limit",
      };
    }
    return { ok: true, retryAfterMs: 0 };
  }

  record() {
    const now = this.now();
    this.rotate(now);
    this.minute.count += 1;
    this.hour.count += 1;
  }

  private rotate(now: number) {
    if (now - this.minute.windowStart >= 60_000) {
      this.minute = { windowStart: now, count: 0 };
    }
    if (now - this.hour.windowStart >= 3_600_000) {
      this.hour = { windowStart: now, count: 0 };
    }
  }
}

function msUntilTomorrow(now: number) {
  const date = new Date(now);
  date.setHours(24, 0, 0, 0);
  return date.getTime() - now;
}
