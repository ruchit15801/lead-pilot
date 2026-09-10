import type { Channel, Lead, LeadStatus, ServiceTarget } from "../../lib/types";
import { computeLeadScore } from "../domain/scoring";
import { routeChannel } from "../domain/routing";
import { NotFoundError, ValidationError } from "../lib/errors";
import { loadDb, mutate, newId, nowIso } from "../store/fileStore";
import { buildSeed } from "../store/seed";

export async function ensureSeeded() {
  await mutate((db) => {
    if (db.leads.length === 0) {
      const seed = buildSeed();
      db.leads = seed.leads;
      db.campaigns = seed.campaigns;
      db.messages = seed.messages;
      db.meetings = seed.meetings;
      db.activities = seed.activities;
      db.sessions = seed.sessions;
      db.settings = seed.settings;
    }
  });
}

export function applyLeadDerived(input: {
  name: string;
  company: string;
  role: string;
  email?: string;
  phone?: string;
  source: string;
  service?: ServiceTarget;
  companySize?: Lead["companySize"];
  scrapedAt?: string;
  sourceUrl?: string;
  notes?: string;
  status?: LeadStatus;
}): Omit<Lead, "id" | "createdAt"> & { createdAt?: string } {
  const scored = computeLeadScore(input);
  const routed = routeChannel(input);
  let status: LeadStatus = input.status ?? scored.bucket;
  if (!routed.primary && status === "queued") status = "needs_research";

  return {
    name: input.name,
    company: input.company,
    role: input.role,
    email: input.email,
    phone: input.phone,
    source: input.source,
    sourceUrl: input.sourceUrl,
    service: input.service ?? scored.service,
    companySize: input.companySize,
    notes: input.notes,
    scrapedAt: input.scrapedAt,
    score: scored.score,
    scoreBreakdown: scored.breakdown,
    primaryChannel: routed.primary,
    secondaryChannel: routed.secondary,
    sequenceStep: 0,
    paused: false,
    status,
    updatedAt: nowIso(),
  };
}

export async function createLead(input: Parameters<typeof applyLeadDerived>[0]) {
  if (!input.name?.trim() || !input.company?.trim()) {
    throw new ValidationError("Name and company are required");
  }

  const result = await mutate((db) => {
    const lead: Lead = {
      id: newId(),
      createdAt: nowIso(),
      ...applyLeadDerived(input),
    };
    db.leads.unshift(lead);
    db.activities.unshift({
      id: newId(),
      type: "lead",
      text: `Lead sourced: ${lead.name} — ${lead.company}`,
      leadId: lead.id,
      createdAt: nowIso(),
    });
    return { leadId: lead.id, score: lead.score, lead };
  });

  // Auto-enroll if eligible
  try {
    const { autoEnrollLead } = await import("./automationService");
    await autoEnrollLead(result.lead);
  } catch {
    // Non-critical — enrollment is a bonus
  }

  return result;
}

export async function listLeads(filters: {
  status?: string;
  service?: string;
  channel?: string;
  q?: string;
}) {
  const db = await loadDb();
  return db.leads.filter((lead) => {
    if (filters.status && lead.status !== filters.status) return false;
    if (filters.service && lead.service !== filters.service) return false;
    if (filters.channel && lead.primaryChannel !== filters.channel) return false;
    if (filters.q) {
      const hay = `${lead.name} ${lead.company} ${lead.email ?? ""} ${lead.role}`.toLowerCase();
      if (!hay.includes(filters.q.toLowerCase())) return false;
    }
    return true;
  });
}

export async function getLead(id: string) {
  const db = await loadDb();
  const lead = db.leads.find((item) => item.id === id);
  if (!lead) throw new NotFoundError("Lead", id);
  const messages = db.messages
    .filter((item) => item.leadId === id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const meetings = db.meetings.filter((item) => item.leadId === id);
  return { ...lead, messages, meetings };
}

export async function patchLead(id: string, patch: Partial<Lead>) {
  return mutate((db) => {
    const lead = db.leads.find((item) => item.id === id);
    if (!lead) throw new NotFoundError("Lead", id);
    if (patch.status === "paused") lead.paused = true;
    if (patch.status && patch.status !== "paused") lead.paused = false;
    Object.assign(lead, patch, { updatedAt: nowIso() });
    return lead;
  });
}

export async function deleteLead(id: string) {
  return mutate((db) => {
    const index = db.leads.findIndex((item) => item.id === id);
    if (index === -1) throw new NotFoundError("Lead", id);
    db.leads.splice(index, 1);
    
    // Also cleanup associated messages and activities to keep DB clean
    db.messages = db.messages.filter((m) => m.leadId !== id);
    db.activities = db.activities.filter((a) => a.leadId !== id);
    
    return { success: true };
  });
}

export async function importLeads(
  rows: Array<{
    name?: string;
    company?: string;
    role?: string;
    email?: string;
    phone?: string;
    source?: string;
    service?: string;
  }>,
) {
  let imported = 0;
  let skipped = 0;
  const created: Lead[] = [];

  await mutate((db) => {
    for (const row of rows) {
      if (!row.name?.trim() || !row.company?.trim()) {
        skipped += 1;
        continue;
      }
      const duplicate = db.leads.some(
        (lead) =>
          (row.email && lead.email?.toLowerCase() === row.email.toLowerCase()) ||
          (lead.name.toLowerCase() === row.name!.trim().toLowerCase() &&
            lead.company.toLowerCase() === row.company!.trim().toLowerCase()),
      );
      if (duplicate) {
        skipped += 1;
        continue;
      }
      const service = db.settings.agencyProfile?.services.includes(row.service ?? "")
        ? row.service
        : undefined;
      const derived = applyLeadDerived({
        name: row.name.trim(),
        company: row.company.trim(),
        role: row.role?.trim() || "Unknown",
        email: row.email?.trim(),
        phone: row.phone?.trim(),
        source: row.source?.trim() || "csv",
        service,
      });
      const lead: Lead = { id: newId(), createdAt: nowIso(), ...derived };
      db.leads.unshift(lead);
      created.push(lead);
      imported += 1;
    }
    if (imported) {
      db.activities.unshift({
        id: newId(),
        type: "import",
        text: `Imported ${imported} leads (${skipped} skipped)`,
        createdAt: nowIso(),
      });
    }
  });

  return { imported, skipped, leads: created };
}

export function channelIcon(channel: Channel | null) {
  if (channel === "email") return "email";
  if (channel === "whatsapp") return "whatsapp";
  return null;
}
