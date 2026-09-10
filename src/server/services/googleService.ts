import { google } from "googleapis";
import { AppError } from "../lib/errors";
import { withRetry } from "../lib/retry";
import { loadDb, mutate, nowIso } from "../store/fileStore";

function oauthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirect = process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/v1/oauth/google/callback";
  if (!clientId || !clientSecret) return null;
  const client = new google.auth.OAuth2(clientId, clientSecret, redirect);

  // Automatically persist refreshed tokens to the database for lifetime authentication
  client.on("tokens", (tokens) => {
    mutate((db) => {
      const mappedTokens = {
        access_token: tokens.access_token ?? undefined,
        refresh_token: tokens.refresh_token ?? undefined,
        expiry_date: tokens.expiry_date ?? undefined,
        scope: tokens.scope ?? undefined,
      };
      if (db.googleTokens) {
        db.googleTokens = { ...db.googleTokens, ...mappedTokens };
      } else {
        db.googleTokens = mappedTokens;
      }
    }).catch((err) => console.error("Failed to persist refreshed Google tokens:", err));
  });

  return client;
}

export function googleAuthUrl() {
  const client = oauthClient();
  if (!client) return null;
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  });
}

export async function handleGoogleCallback(code: string) {
  const client = oauthClient();
  if (!client) throw new AppError("Google OAuth is not configured", "GOOGLE_NOT_CONFIGURED", 400);
  const { tokens } = await client.getToken(code);
  await mutate((db) => {
    db.googleTokens = {
      access_token: tokens.access_token ?? undefined,
      refresh_token: tokens.refresh_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
      scope: tokens.scope ?? undefined,
    };
    db.settings.gmailConnected = true;
    db.settings.calendarConnected = true;
  });
  return { ok: true };
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  body: string;
  attachments?: Array<{ name: string; storedName: string; mimeType: string }>;
  threadId?: string;
}) {
  const db = await loadDb();
  const live = Boolean(db.googleTokens?.access_token) && !db.settings.sandboxMode;

  if (live) {
    let threadId: string | undefined;
    await withRetry(async () => {
      const client = oauthClient();
      if (!client || !db.googleTokens) throw new AppError("Gmail is not connected", "GMAIL_DISCONNECTED", 409);
      client.setCredentials(db.googleTokens);
      const gmail = google.gmail({ version: "v1", auth: client });

      let raw: string;
      if (input.attachments?.length) {
        raw = await buildMimeWithAttachments(input);
      } else {
        raw = Buffer.from(
          `To: ${input.to}\r\nSubject: ${input.subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${input.body}`,
        )
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
      }

      const requestBody: { raw: string; threadId?: string } = { raw };
      if (input.threadId) requestBody.threadId = input.threadId;

      const result = await gmail.users.messages.send({ userId: "me", requestBody });
      if (!result.data.id) throw new Error("Gmail send returned no id");
      threadId = result.data.threadId ?? undefined;
    });
    return { messageId: crypto.randomUUID(), status: "sent" as const, provider: "gmail", threadId };
  }

  if (process.env.SANDBOX_MODE === "false" && !db.settings.gmailConnected) {
    throw new AppError("Gmail is not connected", "GMAIL_DISCONNECTED", 409);
  }

  return { messageId: crypto.randomUUID(), status: "sent" as const, provider: "sandbox", threadId: undefined };
}

async function buildMimeWithAttachments(input: {
  to: string;
  subject: string;
  body: string;
  attachments?: Array<{ name: string; storedName: string; mimeType: string }>;
}): Promise<string> {
  const boundary = `boundary_${crypto.randomUUID().replace(/-/g, "")}`;
  const parts: string[] = [];

  parts.push(`To: ${input.to}`);
  parts.push(`Subject: ${input.subject}`);
  parts.push(`MIME-Version: 1.0`);
  parts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  parts.push("");

  // Text body
  parts.push(`--${boundary}`);
  parts.push("Content-Type: text/plain; charset=utf-8");
  parts.push("");
  parts.push(input.body);

  // Attachments
  if (input.attachments) {
    const path = await import("node:path");
    const fs = await import("node:fs/promises");
    const uploadsDir = path.join(process.cwd(), "data", "uploads");

    for (const attachment of input.attachments) {
      try {
        const filePath = path.join(uploadsDir, attachment.storedName);
        const fileBuffer = await fs.readFile(filePath);
        const base64 = fileBuffer.toString("base64");

        parts.push(`--${boundary}`);
        parts.push(`Content-Type: ${attachment.mimeType}; name="${attachment.name}"`);
        parts.push("Content-Transfer-Encoding: base64");
        parts.push(`Content-Disposition: attachment; filename="${attachment.name}"`);
        parts.push("");
        parts.push(base64);
      } catch {
        console.error(`Attachment not found: ${attachment.storedName}`);
      }
    }
  }

  parts.push(`--${boundary}--`);

  return Buffer.from(parts.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function createCalendarEvent(input: {
  title: string;
  slot: Date;
  durationMinutes: number;
  attendee?: string;
}) {
  const db = await loadDb();
  const end = new Date(input.slot.getTime() + input.durationMinutes * 60_000);
  const live = Boolean(db.googleTokens?.access_token) && !db.settings.sandboxMode;

  if (live) {
    const client = oauthClient();
    if (!client || !db.googleTokens) throw new AppError("Calendar is not connected", "CALENDAR_DISCONNECTED", 409);
    client.setCredentials(db.googleTokens);
    const calendar = google.calendar({ version: "v3", auth: client });
    const event = await withRetry(() =>
      calendar.events.insert({
        calendarId: "primary",
        sendUpdates: input.attendee ? "all" : "none",
        requestBody: {
          summary: input.title,
          start: { dateTime: input.slot.toISOString() },
          end: { dateTime: end.toISOString() },
          attendees: input.attendee ? [{ email: input.attendee }] : [],
        },
      }),
    );
    return { calendarEventId: event.data.id ?? undefined };
  }

  return { calendarEventId: `sandbox-${crypto.randomUUID()}` };
}

export async function integrationHealth() {
  const db = await loadDb();
  const liveGoogle = Boolean(db.googleTokens?.access_token);
  return {
    gmail: {
      ok: db.settings.gmailConnected || liveGoogle || db.settings.sandboxMode,
      mode: liveGoogle && !db.settings.sandboxMode ? ("live" as const) : db.settings.gmailConnected || db.settings.sandboxMode ? ("sandbox" as const) : ("disconnected" as const),
    },
    calendar: {
      ok: db.settings.calendarConnected || liveGoogle || db.settings.sandboxMode,
      mode: liveGoogle && !db.settings.sandboxMode ? ("live" as const) : db.settings.calendarConnected || db.settings.sandboxMode ? ("sandbox" as const) : ("disconnected" as const),
    },
  };
}

export async function setIntegrationFlags(patch: { gmailConnected?: boolean; calendarConnected?: boolean }) {
  return mutate((db) => {
    if (patch.gmailConnected !== undefined) db.settings.gmailConnected = patch.gmailConnected;
    if (patch.calendarConnected !== undefined) db.settings.calendarConnected = patch.calendarConnected;
    return db.settings;
  });
}

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export { nowIso };
