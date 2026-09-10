import type { Channel, Lead, Message, Sentiment } from "../../lib/types";
import { nextAvailableSlot } from "../domain/calendar";
import { shouldStopSequence } from "../domain/followup";
import { nextFollowUpAt } from "../domain/followup";
import { classifyReply } from "../domain/sentiment";
import { AppError, NotFoundError } from "../lib/errors";
import { makeIdempotencyKey, rememberIdempotency } from "../lib/crypto";
import { loadDb, mutate, newId, nowIso } from "../store/fileStore";
import { generateMessage, humanize } from "./aiRouter";
import { createCalendarEvent, sendEmail } from "./googleService";
import { sendWhatsApp } from "./whatsappService";

function outreachPrompt(lead: Lead, channel: Channel, tone: string, stepLabel: string) {
  const service = lead.service || "software";
  return `Write a short ${channel} outreach message.
Tone: ${tone}
Step: ${stepLabel}
Sender: Ruchit at Axoryte Infosoft (web, mobile, AI automation, SaaS, UI/UX).
Name: ${lead.name}
Company: ${lead.company}
Role: ${lead.role}
Service: ${service}
Keep it under 80 words, one clear CTA to book a 20-minute call. No fake personal history.`;
}

export async function generateOutreachMessage(input: {
  leadId: string;
  channel: Channel;
  tone?: string;
}) {
  const db = await loadDb();
  const lead = db.leads.find((item) => item.id === input.leadId);
  if (!lead) throw new NotFoundError("Lead", input.leadId);
  const draft = await generateMessage(
    outreachPrompt(lead, input.channel, input.tone ?? "direct", "custom"),
  );
  const polished = await humanize(draft.text);
  return { message: polished.text, provider: polished.provider };
}

export async function sendStepToLead(leadId: string, options?: { forceChannel?: Channel }) {
  const db = await loadDb();
  const lead = db.leads.find((item) => item.id === leadId);
  if (!lead) throw new NotFoundError("Lead", leadId);
  if (lead.paused || shouldStopSequence(lead.status, lead.sequenceStep)) {
    return { skipped: true, reason: "stopped" };
  }

  const campaign = db.campaigns.find((item) => item.id === lead.campaignId);
  const step = campaign?.sequence[lead.sequenceStep];
  const channel =
    options?.forceChannel ??
    step?.channel ??
    lead.primaryChannel ??
    (lead.secondaryChannel || null);

  if (!channel) {
    await mutate((store) => {
      const current = store.leads.find((item) => item.id === leadId);
      if (current) current.status = "needs_research";
    });
    return { skipped: true, reason: "no_channel" };
  }

  const idempotencyKey = makeIdempotencyKey([
    lead.id,
    campaign?.id,
    lead.sequenceStep,
    channel,
  ]);
  if (db.messages.some((item) => item.idempotencyKey === idempotencyKey && item.status === "sent")) {
    return { skipped: true, reason: "duplicate" };
  }

  const label = step?.label ?? "Custom";
  let body = "";
  let provider = "template";
  try {
    const draft = await generateMessage(outreachPrompt(lead, channel, "direct", label));
    const polished = await humanize(draft.text);
    body = polished.text;
    provider = polished.provider;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "AI generation failed";
    await recordFailed(lead.id, campaign?.id, channel, lead.sequenceStep, idempotencyKey, reason);
    throw error;
  }

  try {
    let sendResult: { messageId: string; status: string; provider?: string; threadId?: string };
    const subject = lead.sequenceStep > 0
      ? `Re: ${lead.company} x Axoryte`
      : `${lead.company} x Axoryte`;

    if (channel === "email") {
      if (!lead.email) throw new AppError("Lead has no email", "NO_EMAIL", 422);

      // Include attachments on initial outreach (step 0)
      const attachments = lead.sequenceStep === 0
        ? db.settings.attachments.map((att) => ({
            name: att.name,
            storedName: att.storedName,
            mimeType: att.mimeType,
          }))
        : undefined;

      // Find previous thread ID for follow-ups
      const prevMessage = db.messages.find(
        (msg) => msg.leadId === leadId && msg.channel === "email" && msg.direction === "outbound" && msg.threadId,
      );

      sendResult = await sendEmail({
        to: lead.email,
        subject,
        body,
        attachments: attachments?.length ? attachments : undefined,
        threadId: prevMessage?.threadId,
      });
    } else {
      if (!lead.phone) throw new AppError("Lead has no phone", "NO_PHONE", 422);
      const session = db.sessions[0];
      sendResult = await sendWhatsApp({
        sessionId: session?.id ?? "wa-default",
        chatId: normalizePhone(lead.phone),
        text: body,
        idempotencyKey,
      });
    }

    await mutate((store) => {
      const current = store.leads.find((item) => item.id === leadId);
      if (!current) return;
      store.messages.push({
        id: sendResult.messageId,
        leadId,
        campaignId: campaign?.id,
        channel,
        direction: "outbound",
        body,
        subject: channel === "email" ? subject : undefined,
        status: "sent",
        idempotencyKey,
        stepIndex: current.sequenceStep,
        provider: sendResult.provider ?? provider,
        threadId: sendResult.threadId,
        createdAt: nowIso(),
      });
      rememberIdempotency(idempotencyKey);
      current.status = current.status === "queued" || current.status === "new" ? "contacted" : current.status;
      current.sequenceStep += 1;
      const next = campaign?.sequence[current.sequenceStep];
      current.nextFollowUpAt = next
        ? nextFollowUpAt(new Date(), next.dayOffset - (step?.dayOffset ?? 0)).toISOString()
        : undefined;
      if (!next || current.sequenceStep > 3) current.nextFollowUpAt = undefined;
      current.updatedAt = nowIso();
      store.activities.unshift({
        id: newId(),
        type: "send",
        text: `${channel === "email" ? "Email" : "WhatsApp"} sent to ${current.name}`,
        leadId: current.id,
        createdAt: nowIso(),
      });
    });

    return { skipped: false, channel, body };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Send failed";
    await recordFailed(lead.id, campaign?.id, channel, lead.sequenceStep, idempotencyKey, reason, body);
    throw error;
  }
}

async function recordFailed(
  leadId: string,
  campaignId: string | undefined,
  channel: Channel,
  stepIndex: number,
  idempotencyKey: string,
  reason: string,
  body = "",
) {
  await mutate((store) => {
    store.messages.push({
      id: newId(),
      leadId,
      campaignId,
      channel,
      direction: "outbound",
      body: body || "(not generated)",
      status: "failed",
      errorReason: reason,
      idempotencyKey: `${idempotencyKey}:failed:${Date.now()}`,
      stepIndex,
      createdAt: nowIso(),
    });
    store.activities.unshift({
      id: newId(),
      type: "error",
      text: `Failed send to lead ${leadId}: ${reason}`,
      leadId,
      createdAt: nowIso(),
    });
  });
}

export async function processDueOutreach() {
  const db = await loadDb();
  const due = db.leads.filter((lead) => {
    if (lead.paused) return false;
    if (!["queued", "contacted"].includes(lead.status)) return false;
    if (!lead.campaignId) return false;
    const campaign = db.campaigns.find((item) => item.id === lead.campaignId && item.status === "active");
    if (!campaign) return false;
    if (!lead.nextFollowUpAt) return lead.status === "queued";
    return new Date(lead.nextFollowUpAt).getTime() <= Date.now();
  });

  const results = [];
  for (const lead of due) {
    try {
      results.push({ leadId: lead.id, ...(await sendStepToLead(lead.id)) });
    } catch (error) {
      results.push({
        leadId: lead.id,
        skipped: true,
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  }
  return { processed: due.length, results };
}

export async function ingestReply(input: {
  leadId?: string;
  phone?: string;
  email?: string;
  text: string;
  channel: Channel;
}) {
  return mutate(async (db) => {
    const lead = db.leads.find((item) => {
      if (input.leadId) return item.id === input.leadId;
      if (input.email && item.email?.toLowerCase() === input.email.toLowerCase()) return true;
      if (input.phone && normalizePhone(item.phone ?? "") === normalizePhone(input.phone)) return true;
      return false;
    });
    if (!lead) throw new NotFoundError("Lead", input.leadId ?? input.email ?? input.phone ?? "unknown");

    const sentiment = classifyReply(input.text);
    const message: Message = {
      id: newId(),
      leadId: lead.id,
      campaignId: lead.campaignId,
      channel: input.channel,
      direction: "inbound",
      body: input.text,
      status: "delivered",
      idempotencyKey: makeIdempotencyKey(["in", lead.id, input.text, Date.now()]),
      sentiment,
      createdAt: nowIso(),
    };
    db.messages.push(message);

    if (sentiment === "negative" || sentiment === "unsubscribe") {
      lead.status = "lost";
      lead.paused = true;
      lead.nextFollowUpAt = undefined;
      db.activities.unshift({
        id: newId(),
        type: "lost",
        text: `${lead.name} unsubscribed / declined — sequence stopped`,
        leadId: lead.id,
        createdAt: nowIso(),
      });
      return { lead, sentiment, meeting: null };
    }

    if (sentiment === "neutral") {
      if (lead.status !== "meeting_booked") lead.status = "replied";
      db.activities.unshift({
        id: newId(),
        type: "review",
        text: `${lead.name} replied (needs review)`,
        leadId: lead.id,
        createdAt: nowIso(),
      });
      return { lead, sentiment, meeting: null };
    }

    const slot = nextAvailableSlot(db.meetings, 30);
    const title = `Axoryte x ${lead.company}`;
    const calendar = await createCalendarEvent({
      title,
      slot,
      durationMinutes: 30,
      attendee: lead.email,
    });
    const meeting = {
      id: newId(),
      leadId: lead.id,
      title,
      slot: slot.toISOString(),
      durationMinutes: 30,
      calendarEventId: calendar.calendarEventId,
      status: "booked" as const,
      createdAt: nowIso(),
    };
    db.meetings.unshift(meeting);
    lead.status = "meeting_booked";
    lead.paused = true;
    lead.nextFollowUpAt = undefined;
    lead.updatedAt = nowIso();
    db.activities.unshift({
      id: newId(),
      type: "meeting",
      text: `Meeting booked with ${lead.name}`,
      leadId: lead.id,
      createdAt: nowIso(),
    });
    return { lead, sentiment, meeting };
  });
}

function normalizePhone(value: string) {
  return value.replace(/[^\d]/g, "");
}
