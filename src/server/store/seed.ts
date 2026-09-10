import type { Campaign, Lead, Meeting, Message, SequenceStep } from "../../lib/types";
import { computeLeadScore } from "../domain/scoring";
import { routeChannel } from "../domain/routing";
import { DEFAULT_SEQUENCE } from "../domain/followup";
import { newId } from "./fileStore";

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function enrichLead(partial: Omit<Lead, "score" | "scoreBreakdown" | "primaryChannel" | "secondaryChannel" | "updatedAt"> & { score?: number }): Lead {
  const scored = computeLeadScore(partial);
  const routed = routeChannel(partial);
  const status =
    partial.status ??
    (routed.primary === null && scored.bucket === "queued" ? "needs_research" : scored.bucket);

  return {
    ...partial,
    service: partial.service ?? scored.service,
    score: scored.score,
    scoreBreakdown: scored.breakdown,
    primaryChannel: routed.primary,
    secondaryChannel: routed.secondary,
    status,
    updatedAt: partial.createdAt,
  };
}

const sequence: SequenceStep[] = DEFAULT_SEQUENCE.map((step) => ({ ...step }));

export function buildSeed() {
  const john = enrichLead({
    id: "lead-john",
    name: "John Doe",
    company: "Acme Inc",
    role: "CTO",
    email: "john@acme.com",
    source: "LinkedIn",
    service: "web_dev",
    companySize: "startup",
    sequenceStep: 1,
    paused: false,
    status: "contacted",
    campaignId: "camp-web",
    createdAt: isoDaysAgo(6),
    scrapedAt: isoDaysAgo(4),
  });

  const priya = enrichLead({
    id: "lead-priya",
    name: "Priya Shah",
    company: "Zeta Labs",
    role: "Head of AI",
    phone: "+919876543210",
    email: "priya@zetalabs.ai",
    source: "Company site",
    service: "ai_automation",
    companySize: "smb",
    sequenceStep: 1,
    paused: false,
    status: "replied",
    campaignId: "camp-ai",
    createdAt: isoDaysAgo(8),
    scrapedAt: isoDaysAgo(5),
  });

  const more: Lead[] = [
    enrichLead({
      id: "lead-omar",
      name: "Omar Khan",
      company: "Northwind Retail",
      role: "Founder",
      email: "omar@northwind.co",
      source: "CSV import",
      service: "web_dev",
      companySize: "smb",
      sequenceStep: 0,
      paused: false,
      status: "queued",
      campaignId: "camp-web",
      createdAt: isoDaysAgo(1),
    }),
    enrichLead({
      id: "lead-mei",
      name: "Mei Chen",
      company: "Lumen Health",
      role: "Product Lead",
      email: "mei@lumen.health",
      phone: "+14155550199",
      source: "Referral",
      service: "saas",
      companySize: "startup",
      sequenceStep: 0,
      paused: false,
      status: "review",
      createdAt: isoDaysAgo(2),
    }),
    enrichLead({
      id: "lead-ravi",
      name: "Ravi Patel",
      company: "Orbit Apps",
      role: "Mobile Lead",
      phone: "+918888111222",
      source: "Directory",
      service: "mobile_app",
      companySize: "startup",
      sequenceStep: 0,
      paused: false,
      status: "queued",
      createdAt: isoDaysAgo(3),
    }),
    enrichLead({
      id: "lead-sofia",
      name: "Sofia Alves",
      company: "Nimbus Studio",
      role: "Design Director",
      email: "sofia@nimbus.studio",
      source: "LinkedIn",
      service: "ui_ux",
      companySize: "smb",
      sequenceStep: 0,
      paused: false,
      status: "new",
      createdAt: isoDaysAgo(1),
    }),
    enrichLead({
      id: "lead-erik",
      name: "Erik Holm",
      company: "Giantbank",
      role: "VP Engineering",
      email: "erik@giantbank.com",
      source: "Unknown",
      service: "web_dev",
      companySize: "enterprise",
      sequenceStep: 0,
      paused: false,
      status: "discarded",
      createdAt: isoDaysAgo(40),
      scrapedAt: isoDaysAgo(200),
    }),
  ];

  const leads = [john, priya, ...more];

  const campaigns: Campaign[] = [
    {
      id: "camp-web",
      name: "Web Dev Outreach",
      serviceTarget: "web_dev",
      status: "active",
      leadIds: ["lead-john", "lead-omar"],
      sequence,
      createdAt: isoDaysAgo(10),
      updatedAt: isoDaysAgo(1),
    },
    {
      id: "camp-ai",
      name: "AI Automation Q3",
      serviceTarget: "ai_automation",
      status: "paused",
      leadIds: ["lead-priya"],
      sequence,
      createdAt: isoDaysAgo(20),
      updatedAt: isoDaysAgo(2),
    },
  ];

  const messages: Message[] = [
    {
      id: "msg-1",
      leadId: "lead-john",
      campaignId: "camp-web",
      channel: "email",
      direction: "outbound",
      subject: "Acme's next web stack",
      body: "Hi John, saw Acme is expanding and figured a faster web stack might help the launch. Open to a short look this week?",
      status: "sent",
      idempotencyKey: "seed-1",
      stepIndex: 0,
      provider: "sandbox",
      createdAt: isoDaysAgo(6),
    },
    {
      id: "msg-2",
      leadId: "lead-john",
      campaignId: "camp-web",
      channel: "email",
      direction: "outbound",
      subject: "Quick follow-up",
      body: "Following up in case the note got buried — happy to show a 15-min walkthrough of similar launches.",
      status: "sent",
      idempotencyKey: "seed-2",
      stepIndex: 1,
      provider: "sandbox",
      createdAt: isoDaysAgo(3),
    },
    {
      id: "msg-3",
      leadId: "lead-priya",
      campaignId: "camp-ai",
      channel: "whatsapp",
      direction: "outbound",
      body: "Hi Priya — noticed Zeta is hiring around automation. We build AI workflows for small teams. Worth a chat?",
      status: "sent",
      idempotencyKey: "seed-3",
      stepIndex: 0,
      provider: "sandbox",
      createdAt: isoDaysAgo(5),
    },
    {
      id: "msg-4",
      leadId: "lead-priya",
      campaignId: "camp-ai",
      channel: "whatsapp",
      direction: "inbound",
      body: "Sounds interesting, tell me more",
      status: "delivered",
      idempotencyKey: "seed-4",
      sentiment: "positive",
      createdAt: isoDaysAgo(4),
    },
  ];

  const meetings: Meeting[] = [
    {
      id: "mtg-1",
      leadId: "lead-john",
      title: `Axoryte x ${john.company}`,
      slot: "2026-09-12T10:00:00.000+05:30",
      durationMinutes: 30,
      status: "booked",
      createdAt: isoDaysAgo(1),
    },
    {
      id: "mtg-2",
      leadId: "lead-priya",
      title: `Axoryte x ${priya.company}`,
      slot: "2026-09-14T11:30:00.000+05:30",
      durationMinutes: 30,
      status: "booked",
      createdAt: isoDaysAgo(1),
    },
  ];

  return {
    leads,
    campaigns,
    messages,
    meetings,
    activities: [
      {
        id: newId(),
        type: "reply",
        text: `Lead ${priya.name} replied`,
        leadId: priya.id,
        createdAt: isoDaysAgo(4),
      },
      {
        id: newId(),
        type: "meeting",
        text: `Meeting booked with ${john.name}`,
        leadId: john.id,
        createdAt: isoDaysAgo(1),
      },
      {
        id: newId(),
        type: "meeting",
        text: `Meeting booked with ${priya.name}`,
        leadId: priya.id,
        createdAt: isoDaysAgo(1),
      },
      {
        id: newId(),
        type: "system",
        text: "WhatsApp session OK",
        createdAt: isoDaysAgo(0),
      },
    ],
    sessions: [
      {
        id: "wa-default",
        name: "Axoryte outreach",
        status: "disconnected" as const,
        sentToday: 42,
        sentTodayDate: new Date().toISOString().slice(0, 10),
        createdAt: isoDaysAgo(12),
        updatedAt: isoDaysAgo(0),
      },
    ],
    settings: {
      gmailConnected: true,
      calendarConnected: true,
      sandboxMode: true,
      aiKeysConfigured: {
        groq: Boolean(process.env.GROQ_API_KEY),
        gemini: Boolean(process.env.GEMINI_API_KEY),
        openrouter: Boolean(process.env.OPENROUTER_API_KEY),
      },
      attachments: [],
      agencyProfile: {
        url: "https://axoryte.com",
        name: "Axoryte",
        description: "IT services company specializing in web dev, apps, AI, and SaaS.",
        services: ["Web Development", "Mobile Apps", "AI Automation", "SaaS Development", "UI/UX Design"],
        searchQueries: [
          { service: "Web Development", query: "\"looking for\" web developer" },
          { service: "Mobile Apps", query: "\"mobile app development\" company" },
          { service: "AI Automation", query: "\"AI automation\" company" },
          { service: "SaaS Development", query: "\"SaaS development\" company" },
          { service: "UI/UX Design", query: "\"UI UX design\" company" }
        ]
      }
    },
  };
}

export function serviceLabel(service?: string) {
  if (!service) return "Unassigned";
  // Convert standard internal tags to display names if they match
  const standard: Record<string, string> = {
    web_dev: "Web Dev",
    mobile_app: "Mobile App",
    ai_automation: "AI Automation",
    saas: "SaaS",
    ui_ux: "UI/UX",
  };
  return standard[service] ?? service;
}
