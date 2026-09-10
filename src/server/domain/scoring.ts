import type { CompanySizeFit, Lead, ScoreBreakdown, ServiceTarget } from "../../lib/types";
// No longer using hardcoded SERVICE_KEYWORDS

const OFFICIAL_SOURCES = [
  "linkedin",
  "website",
  "official",
  "referral",
  "site",
  "company site",
];
const DIRECTORY_SOURCES = [
  "directory",
  "crunchbase",
  "google",
  "csv",
  "import",
  "apollo",
  "n8n",
  "scraper",
];

export interface ScoreInput {
  name?: string;
  company: string;
  role: string;
  email?: string;
  phone?: string;
  source: string;
  service?: ServiceTarget;
  companySize?: CompanySizeFit;
  scrapedAt?: string;
  createdAt?: string;
}

export function serviceMatchScore(input: ScoreInput): { value: number; service?: ServiceTarget } {
  if (input.service) return { value: 1, service: input.service };
  return { value: 0, service: undefined };
}

export function contactCompletenessScore(email?: string, phone?: string): number {
  const hasEmail = Boolean(email?.trim());
  const hasPhone = Boolean(phone?.trim());
  if (hasEmail && hasPhone) return 1;
  if (hasEmail || hasPhone) return 0.6;
  return 0;
}

export function companySizeFitScore(size?: CompanySizeFit): number {
  if (!size || size === "unknown") return 0.5;
  if (size === "smb" || size === "startup") return 1;
  return 0;
}

export function sourceQualityScore(source: string): number {
  const value = source.toLowerCase();
  if (OFFICIAL_SOURCES.some((item) => value.includes(item))) return 1;
  if (DIRECTORY_SOURCES.some((item) => value.includes(item))) return 0.5;
  return 0.2;
}

export function recencyScore(isoDate?: string, now = new Date()): number {
  if (!isoDate) return 1;
  const then = new Date(isoDate);
  if (Number.isNaN(then.getTime())) return 0.5;
  const ageDays = (now.getTime() - then.getTime()) / 86_400_000;
  if (ageDays <= 30) return 1;
  if (ageDays >= 180) return 0;
  return Number(((180 - ageDays) / 150).toFixed(4));
}

export function computeLeadScore(input: ScoreInput, now = new Date()) {
  const service = serviceMatchScore(input);
  const breakdown: ScoreBreakdown = {
    serviceMatch: service.value,
    contactCompleteness: contactCompletenessScore(input.email, input.phone),
    companySizeFit: companySizeFitScore(input.companySize),
    sourceQuality: sourceQualityScore(input.source),
    recency: recencyScore(input.scrapedAt ?? input.createdAt, now),
  };

  const score = Math.round(
    breakdown.serviceMatch * 40 +
      breakdown.contactCompleteness * 25 +
      breakdown.companySizeFit * 15 +
      breakdown.sourceQuality * 10 +
      breakdown.recency * 10,
  );

  return {
    score,
    breakdown,
    service: service.service,
    bucket: scoreBucket(score),
  };
}

export function scoreBucket(score: number): Extract<Lead["status"], "queued" | "review" | "discarded"> {
  if (score >= 70) return "queued";
  if (score >= 40) return "review";
  return "discarded";
}
