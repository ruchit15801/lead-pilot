import { loadDb, mutate, newId, nowIso } from "../store/fileStore";
import { configuredAiProviders } from "./aiRouter";
import { integrationHealth } from "./googleService";
import { getDefaultSession } from "./whatsappService";
import { databaseHealth } from "../store";

export async function dashboardStats() {
  const db = await loadDb();
  const sourced = db.leads.length;
  const contacted = db.leads.filter((lead) =>
    ["contacted", "replied", "meeting_booked", "lost"].includes(lead.status),
  ).length;
  const replied = db.leads.filter((lead) =>
    ["replied", "meeting_booked"].includes(lead.status),
  ).length;
  const booked = db.meetings.filter((meeting) => meeting.status === "booked").length;

  return {
    leads: sourced,
    sourced,
    contacted,
    replied,
    booked,
    funnel: [
      { stage: "Sourced", count: sourced },
      { stage: "Contacted", count: contacted },
      { stage: "Replied", count: replied },
      { stage: "Booked", count: booked },
    ],
  };
}

export async function listActivity(limit = 20) {
  const db = await loadDb();
  return db.activities.slice(0, limit);
}

export async function getSettings() {
  const db = await loadDb();
  const session = await getDefaultSession();
  return {
    ...db.settings,
    aiKeysConfigured: configuredAiProviders(),
    whatsapp: {
      sessionId: session.id,
      status: session.status,
      sentToday: session.sentToday,
    },
    googleOAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID),
  };
}

export async function addAttachment(file: { name: string; storedName: string; mimeType: string; size: number }) {
  return mutate((db) => {
    const attachment = {
      id: newId(),
      name: file.name,
      storedName: file.storedName,
      mimeType: file.mimeType,
      size: file.size,
      uploadedAt: nowIso(),
    };
    db.settings.attachments.push(attachment);
    return attachment;
  });
}

export async function health() {
  const dbCheck = databaseHealth();
  const integrations = await integrationHealth();
  const session = await getDefaultSession();
  const ai = configuredAiProviders();
  const providers = Object.entries(ai)
    .filter(([, ok]) => ok)
    .map(([name]) => name);
  if (providers.length === 0) providers.push("template");

  const checks = {
    database: dbCheck,
    gmail: integrations.gmail,
    calendar: integrations.calendar,
    whatsapp: { ok: session.status === "connected", status: session.status },
    ai: { ok: true, providers },
  };

  return {
    ok: checks.database.ok,
    checks,
  };
}
