import { describe, expect, it } from "vitest";
import { computeLeadScore, recencyScore } from "./scoring";

describe("lead scoring", () => {
  it("scores a complete matching lead into the outreach queue", () => {
    const result = computeLeadScore({
      name: "John Doe",
      company: "Acme Inc",
      role: "CTO looking for web development",
      email: "john@acme.com",
      phone: "+15551234567",
      source: "LinkedIn",
      service: "web_dev",
      companySize: "startup",
      scrapedAt: new Date().toISOString(),
    });

    expect(result.score).toBe(100);
    expect(result.bucket).toBe("queued");
  });

  it("puts partial-contact directory leads into review", () => {
    const result = computeLeadScore({
      company: "Zeta",
      role: "SaaS founder",
      email: "priya@zeta.dev",
      phone: "+1234",
      source: "csv import",
      companySize: "unknown",
      service: "saas",
    });

    expect(result.score).toBe(88);
    expect(result.bucket).toBe("queued");
  });

  it("discards leads with no contact and no match", () => {
    const result = computeLeadScore({
      company: "Unknown Co",
      role: "Intern",
      source: "random forum",
      companySize: "enterprise",
    });

    expect(result.score).toBeLessThan(40);
    expect(result.bucket).toBe("discarded");
  });

  it("decays recency linearly between 30 and 180 days", () => {
    const now = new Date("2026-09-08T00:00:00.000Z");
    expect(recencyScore(new Date("2026-08-20T00:00:00.000Z").toISOString(), now)).toBe(1);
    expect(recencyScore(new Date("2026-03-12T00:00:00.000Z").toISOString(), now)).toBe(0);
    const mid = recencyScore(new Date("2026-06-10T00:00:00.000Z").toISOString(), now);
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.7);
  });
});
