export type ServiceTarget = string;

export const LEAD_STATUSES = [
  "new",
  "review",
  "queued",
  "needs_research",
  "contacted",
  "replied",
  "meeting_booked",
  "paused",
  "lost",
  "discarded",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type Channel = "email" | "whatsapp";
export type CampaignStatus = "draft" | "active" | "paused" | "completed";
export type MessageStatus = "queued" | "sent" | "failed" | "delivered";
export type MessageDirection = "outbound" | "inbound";
export type Sentiment = "positive" | "neutral" | "negative" | "unsubscribe";
export type CompanySizeFit = "smb" | "startup" | "enterprise" | "unknown";

export interface ScoreBreakdown {
  serviceMatch: number;
  contactCompleteness: number;
  companySizeFit: number;
  sourceQuality: number;
  recency: number;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  role: string;
  email?: string;
  phone?: string;
  source: string;
  sourceUrl?: string;
  service?: ServiceTarget;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  status: LeadStatus;
  primaryChannel: Channel | null;
  secondaryChannel: Channel | null;
  campaignId?: string;
  sequenceStep: number;
  nextFollowUpAt?: string;
  paused: boolean;
  companySize?: CompanySizeFit;
  notes?: string;
  scrapedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SequenceStep {
  index: number;
  dayOffset: number;
  channel: Channel;
  label: string;
  prompt?: string;
}

export interface Campaign {
  id: string;
  name: string;
  serviceTarget: ServiceTarget;
  status: CampaignStatus;
  leadIds: string[];
  sequence: SequenceStep[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  leadId: string;
  campaignId?: string;
  channel: Channel;
  direction: MessageDirection;
  body: string;
  subject?: string;
  status: MessageStatus;
  errorReason?: string;
  idempotencyKey: string;
  stepIndex?: number;
  sentiment?: Sentiment;
  provider?: string;
  threadId?: string;
  createdAt: string;
}

export interface Meeting {
  id: string;
  leadId: string;
  title: string;
  slot: string;
  durationMinutes: number;
  calendarEventId?: string;
  status: "booked" | "cancelled";
  createdAt: string;
}

export interface Activity {
  id: string;
  type: string;
  text: string;
  leadId?: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  storedName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface WhatsAppSession {
  id: string;
  name: string;
  status: "disconnected" | "qr" | "connected";
  qrImage?: string;
  sentToday: number;
  sentTodayDate: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyProfile {
  url: string;
  name: string;
  description: string;
  services: string[];
  searchQueries: Array<{ service: string; query: string }>;
}

export interface Settings {
  gmailConnected: boolean;
  calendarConnected: boolean;
  sandboxMode: boolean;
  aiKeysConfigured: {
    groq: boolean;
    gemini: boolean;
    openrouter: boolean;
  };
  attachments: Attachment[];
  agencyProfile?: AgencyProfile;
}

export interface DashboardStats {
  leads: number;
  sourced: number;
  contacted: number;
  replied: number;
  booked: number;
  funnel: { stage: string; count: number }[];
}

export interface HealthCheck {
  ok: boolean;
  checks: {
    database: { ok: boolean; driver: "file" | "mongo"; error?: string };
    gmail: { ok: boolean; mode: "live" | "sandbox" | "disconnected" };
    calendar: { ok: boolean; mode: "live" | "sandbox" | "disconnected" };
    whatsapp: { ok: boolean; status: string };
    ai: { ok: boolean; providers: string[] };
  };
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
