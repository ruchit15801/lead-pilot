import { describe, expect, it } from "vitest";
import { routeChannel } from "./routing";
import { delaySeconds, shouldStopSequence } from "./followup";
import { classifyReply } from "./sentiment";
import { WhatsAppRateLimiter, sendIntervalSeconds } from "./rateLimit";

describe("channel routing", () => {
  it("prefers email as primary when both contacts exist", () => {
    expect(routeChannel({ email: "a@b.com", phone: "123" })).toEqual({
      primary: "email",
      secondary: "whatsapp",
    });
  });

  it("routes to needs-research when no contact exists", () => {
    expect(routeChannel({})).toEqual({ primary: null, secondary: null });
  });
});

describe("follow-up timing", () => {
  it("uses short jitter on day 0 and full-day offsets later", () => {
    expect(delaySeconds(0, () => 0.5)).toBe(7.5);
    expect(delaySeconds(3, () => 0.5)).toBe(3 * 86400 + 1800);
  });

  it("stops after replies or the last step", () => {
    expect(shouldStopSequence("replied", 1)).toBe(true);
    expect(shouldStopSequence("contacted", 4)).toBe(true);
    expect(shouldStopSequence("contacted", 2)).toBe(false);
  });
});

describe("reply classification", () => {
  it("classifies positive, unsubscribe, and negative replies", () => {
    expect(classifyReply("Sounds interesting, tell me more")).toBe("positive");
    expect(classifyReply("Please unsubscribe me")).toBe("unsubscribe");
    expect(classifyReply("Not interested, stop")).toBe("negative");
    expect(classifyReply("Who is this?")).toBe("neutral");
  });
});

describe("whatsapp rate limiter", () => {
  it("blocks a 4th send inside the same minute", () => {
    let now = 1_000_000;
    const limiter = new WhatsAppRateLimiter(() => now);
    expect(limiter.canSend(0).ok).toBe(true);
    limiter.record();
    limiter.record();
    limiter.record();
    expect(limiter.canSend(0).ok).toBe(false);
    now += 60_001;
    expect(limiter.canSend(0).ok).toBe(true);
  });

  it("keeps send interval around 20s plus jitter", () => {
    const interval = sendIntervalSeconds(() => 0);
    expect(interval).toBe(25);
  });
});
