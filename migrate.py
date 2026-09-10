import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

# Health
write_file("src/app/api/v1/health/route.ts", """
import { NextResponse } from "next/server";
import { health } from "@/server/services/dashboardService";
import { withDb } from "@/server/lib/api-utils";

export async function GET() {
  return withDb(async () => {
    return NextResponse.json(await health());
  });
}
""")

# Google Callback
write_file("src/app/api/v1/oauth/google/callback/route.ts", """
import { NextResponse } from "next/server";
import { handleGoogleCallback } from "@/server/services/googleService";
import { ValidationError } from "@/server/lib/errors";
import { withDb } from "@/server/lib/api-utils";

export async function GET(req: Request) {
  return withDb(async () => {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    if (!code) throw new ValidationError("Missing OAuth code");
    await handleGoogleCallback(code);
    return NextResponse.redirect(process.env.WEB_ORIGIN ?? "http://localhost:3000/dashboard/settings?google=connected");
  });
}
""")

# Whatsapp Webhook
write_file("src/app/api/v1/whatsapp/webhook/route.ts", """
import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/server/services/whatsappService";
import { ingestReply } from "@/server/services/outreachService";
import { UnauthorizedError } from "@/server/lib/errors";
import { withDb } from "@/server/lib/api-utils";

export async function POST(req: Request) {
  return withDb(async () => {
    const raw = await req.text();
    if (!verifyWebhookSignature(raw, req.headers.get("x-webhook-signature") ?? undefined)) {
      throw new UnauthorizedError("Invalid webhook signature");
    }
    const body = JSON.parse(raw);
    const text = body.data?.body ?? body.text ?? "";
    const phone = body.data?.from ?? body.from ?? body.data?.chatId ?? "";
    if (text && phone) {
      await ingestReply({ phone, text, channel: "whatsapp" });
    }
    return NextResponse.json({ ok: true });
  });
}
""")

# Email Webhook
write_file("src/app/api/v1/email/webhook/route.ts", """
import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/server/services/whatsappService";
import { ingestReply } from "@/server/services/outreachService";
import { UnauthorizedError } from "@/server/lib/errors";
import { withDb } from "@/server/lib/api-utils";

export async function POST(req: Request) {
  return withDb(async () => {
    const raw = await req.text();
    if (!verifyWebhookSignature(raw, req.headers.get("x-webhook-signature") ?? undefined)) {
      throw new UnauthorizedError("Invalid webhook signature");
    }
    const body = JSON.parse(raw);
    if (body.text && (body.email || body.from)) {
      await ingestReply({ email: body.email ?? body.from, text: body.text, channel: "email" });
    }
    return NextResponse.json({ ok: true });
  });
}
""")

# Leads
write_file("src/app/api/v1/leads/route.ts", """
import { NextResponse } from "next/server";
import { createLead, listLeads } from "@/server/services/leadService";
import { withApiAuth, str } from "@/server/lib/api-utils";

export async function GET(req: Request) {
  return withApiAuth(req, async () => {
    const { searchParams } = new URL(req.url);
    const leads = await listLeads({
      status: str(searchParams.get("status")),
      service: str(searchParams.get("service")),
      channel: str(searchParams.get("channel")),
      q: str(searchParams.get("q")),
    });
    return NextResponse.json(leads);
  });
}

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    const created = await createLead(body);
    return NextResponse.json({ leadId: created.leadId, score: created.score, lead: created.lead }, { status: 201 });
  });
}
""")

write_file("src/app/api/v1/leads/[id]/route.ts", """
import { NextResponse } from "next/server";
import { getLead, patchLead } from "@/server/services/leadService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await getLead(params.id));
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    return NextResponse.json(await patchLead(params.id, body));
  });
}
""")

write_file("src/app/api/v1/leads/[id]/replies/route.ts", """
import { NextResponse } from "next/server";
import { ingestReply } from "@/server/services/outreachService";
import { ValidationError } from "@/server/lib/errors";
import { withApiAuth } from "@/server/lib/api-utils";
import type { Channel } from "@/lib/types";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    const text = String(body?.text ?? "");
    const channel = (body?.channel as Channel) || "email";
    if (!text.trim()) throw new ValidationError("Reply text is required");
    return NextResponse.json(await ingestReply({ leadId: params.id, text, channel }));
  });
}
""")

write_file("src/app/api/v1/leads/[id]/auto-enroll/route.ts", """
import { NextResponse } from "next/server";
import { getLead } from "@/server/services/leadService";
import { autoEnrollLead } from "@/server/services/automationService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withApiAuth(req, async () => {
    const lead = await getLead(params.id);
    const result = await autoEnrollLead(lead);
    return NextResponse.json(result ?? { enrolled: false, reason: "No matching active campaign or lead not eligible" });
  });
}
""")

# Campaigns
write_file("src/app/api/v1/campaigns/route.ts", """
import { NextResponse } from "next/server";
import { createCampaign, listCampaigns } from "@/server/services/campaignService";
import { ValidationError } from "@/server/lib/errors";
import { withApiAuth } from "@/server/lib/api-utils";
import type { ServiceTarget } from "@/lib/types";

export async function GET(req: Request) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await listCampaigns());
  });
}

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    const serviceTarget = body?.serviceTarget as ServiceTarget;
    if (!serviceTarget) throw new ValidationError("Invalid serviceTarget");
    return NextResponse.json(
      await createCampaign({
        name: String(body?.name ?? ""),
        serviceTarget,
        leadIds: Array.isArray(body?.leadIds) ? body.leadIds : [],
        sequence: body?.sequence,
      }),
      { status: 201 }
    );
  });
}
""")

write_file("src/app/api/v1/campaigns/[id]/route.ts", """
import { NextResponse } from "next/server";
import { patchCampaign } from "@/server/services/campaignService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    return NextResponse.json(await patchCampaign(params.id, body?.status));
  });
}
""")

write_file("src/app/api/v1/campaigns/[id]/start/route.ts", """
import { NextResponse } from "next/server";
import { startCampaign } from "@/server/services/campaignService";
import { processDueOutreach } from "@/server/services/outreachService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withApiAuth(req, async () => {
    const result = await startCampaign(params.id);
    await processDueOutreach();
    return NextResponse.json({ status: result.status });
  });
}
""")

# Outreach
write_file("src/app/api/v1/outreach/generate-message/route.ts", """
import { NextResponse } from "next/server";
import { generateOutreachMessage } from "@/server/services/outreachService";
import { withApiAuth } from "@/server/lib/api-utils";
import type { Channel } from "@/lib/types";

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    return NextResponse.json(
      await generateOutreachMessage({
        leadId: String(body?.leadId ?? ""),
        channel: (body?.channel as Channel) || "email",
        tone: body?.tone,
      })
    );
  });
}
""")

write_file("src/app/api/v1/outreach/process/route.ts", """
import { NextResponse } from "next/server";
import { processDueOutreach } from "@/server/services/outreachService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await processDueOutreach());
  });
}
""")

write_file("src/app/api/v1/outreach/send-now/route.ts", """
import { NextResponse } from "next/server";
import { sendStepToLead } from "@/server/services/outreachService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    return NextResponse.json(await sendStepToLead(String(body?.leadId ?? "")));
  });
}
""")

# Whatsapp
write_file("src/app/api/v1/whatsapp/sessions/route.ts", """
import { NextResponse } from "next/server";
import { createSession } from "@/server/services/whatsappService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    const session = await createSession(String(body?.name ?? "Axoryte outreach"));
    return NextResponse.json({ sessionId: session.id, session }, { status: 201 });
  });
}
""")

write_file("src/app/api/v1/whatsapp/sessions/[id]/qr/route.ts", """
import { NextResponse } from "next/server";
import { getQr } from "@/server/services/whatsappService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await getQr(params.id));
  });
}
""")

write_file("src/app/api/v1/whatsapp/status/route.ts", """
import { NextResponse } from "next/server";
import { whatsappUsage } from "@/server/services/whatsappService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function GET(req: Request) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await whatsappUsage());
  });
}
""")

write_file("src/app/api/v1/whatsapp/sessions/[id]/sandbox-connect/route.ts", """
import { NextResponse } from "next/server";
import { sandboxConnect } from "@/server/services/whatsappService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await sandboxConnect(params.id));
  });
}
""")

write_file("src/app/api/v1/whatsapp/send/route.ts", """
import { NextResponse } from "next/server";
import { sendWhatsApp } from "@/server/services/whatsappService";
import { makeIdempotencyKey, rememberIdempotency } from "@/server/lib/crypto";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    const key = String(req.headers.get("x-idempotency-key") ?? body?.idempotencyKey ?? makeIdempotencyKey([body?.chatId, body?.text, Date.now()]));
    if (rememberIdempotency(key).duplicate) {
      return NextResponse.json({ messageId: key, status: "duplicate" });
    }
    return NextResponse.json(
      await sendWhatsApp({
        sessionId: String(body?.sessionId ?? ""),
        chatId: String(body?.chatId ?? ""),
        text: String(body?.text ?? ""),
        idempotencyKey: key,
      })
    );
  });
}
""")

# Email send
write_file("src/app/api/v1/email/send/route.ts", """
import { NextResponse } from "next/server";
import { sendEmail } from "@/server/services/googleService";
import { getLead } from "@/server/services/leadService";
import { makeIdempotencyKey, rememberIdempotency } from "@/server/lib/crypto";
import { ValidationError } from "@/server/lib/errors";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    const key = String(req.headers.get("x-idempotency-key") ?? makeIdempotencyKey([body?.leadId, body?.subject, body?.body]));
    if (rememberIdempotency(key).duplicate) {
      return NextResponse.json({ messageId: key, status: "duplicate" });
    }
    const lead = await getLead(String(body?.leadId ?? ""));
    if (!lead.email) throw new ValidationError("Lead has no email");
    const sent = await sendEmail({
      to: lead.email,
      subject: String(body?.subject ?? `${lead.company} x Axoryte`),
      body: String(body?.body ?? ""),
    });
    return NextResponse.json(sent);
  });
}
""")

# Meetings
write_file("src/app/api/v1/meetings/route.ts", """
import { NextResponse } from "next/server";
import { bookMeeting, listMeetings } from "@/server/services/meetingService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function GET(req: Request) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await listMeetings());
  });
}

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    return NextResponse.json(await bookMeeting(String(body?.leadId ?? ""), body?.slot), { status: 201 });
  });
}
""")

# Scraper
write_file("src/app/api/v1/scraper/run/route.ts", """
import { NextResponse } from "next/server";
import { runDiscoveryPipeline } from "@/server/services/automationService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    const maxResults = Number(body?.maxResults ?? process.env.SCRAPER_MAX_RESULTS ?? 20);
    const result = await runDiscoveryPipeline({ maxResults });
    return NextResponse.json(result);
  });
}
""")

# Dashboard & Settings
write_file("src/app/api/v1/dashboard/stats/route.ts", """
import { NextResponse } from "next/server";
import { dashboardStats } from "@/server/services/dashboardService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function GET(req: Request) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await dashboardStats());
  });
}
""")

write_file("src/app/api/v1/activity/route.ts", """
import { NextResponse } from "next/server";
import { listActivity } from "@/server/services/dashboardService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function GET(req: Request) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await listActivity());
  });
}
""")

write_file("src/app/api/v1/settings/route.ts", """
import { NextResponse } from "next/server";
import { getSettings } from "@/server/services/dashboardService";
import { setIntegrationFlags } from "@/server/services/googleService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function GET(req: Request) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await getSettings());
  });
}

export async function PATCH(req: Request) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    return NextResponse.json(await setIntegrationFlags(body ?? {}));
  });
}
""")

write_file("src/app/api/v1/settings/agency-profile/route.ts", """
import { NextResponse } from "next/server";
import { onboardAgency } from "@/server/services/agencyService";
import { ValidationError } from "@/server/lib/errors";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    const url = String(body?.url ?? "");
    if (!url || !url.startsWith("http")) throw new ValidationError("Valid URL is required");
    return NextResponse.json(await onboardAgency(url));
  });
}
""")

write_file("src/app/api/v1/settings/google-auth-url/route.ts", """
import { NextResponse } from "next/server";
import { googleAuthUrl, googleConfigured } from "@/server/services/googleService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function GET(req: Request) {
  return withApiAuth(req, async () => {
    return NextResponse.json({ url: googleAuthUrl(), configured: googleConfigured() });
  });
}
""")

# Leads Import (CSV)
write_file("src/app/api/v1/leads/import/route.ts", """
import { NextResponse } from "next/server";
import Papa from "papaparse";
import { importLeads } from "@/server/services/leadService";
import { ValidationError } from "@/server/lib/errors";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      throw new ValidationError("CSV file is required");
    }
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    });
    const rows = parsed.data.map((row) => ({
      name: row.name,
      company: row.company,
      role: row.role,
      email: row.email,
      phone: row.phone,
      source: row.source || "csv",
      service: row.service,
    }));
    return NextResponse.json(await importLeads(rows));
  });
}
""")

# Attachments Upload
write_file("src/app/api/v1/settings/attachments/route.ts", """
import { NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import { addAttachment } from "@/server/services/dashboardService";
import { ValidationError } from "@/server/lib/errors";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      throw new ValidationError("File is required");
    }
    
    // In a real Vercel app, use Vercel Blob. For now, writing to tmp or local disk if not Vercel.
    const isVercel = process.env.VERCEL === '1';
    const uploadDir = isVercel ? '/tmp' : path.join(process.cwd(), "data", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const storedName = file.name ? `${uniqueSuffix}-${file.name}` : uniqueSuffix;
    const filePath = path.join(uploadDir, storedName);
    
    await fs.writeFile(filePath, buffer);

    return NextResponse.json(
      await addAttachment({
        name: file.name || "unknown",
        storedName: storedName,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      }),
      { status: 201 }
    );
  });
}
""")

# Cron Outreach
write_file("src/app/api/v1/cron/outreach/route.ts", """
import { NextResponse } from "next/server";
import { processDueOutreach } from "@/server/services/outreachService";
import { withDb } from "@/server/lib/api-utils";

export async function GET(req: Request) {
  return withDb(async () => {
    // Optionally check authorization header (Vercel Cron securely passes a token)
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }
    await processDueOutreach();
    return NextResponse.json({ ok: true, task: "outreach" });
  });
}
""")

# Cron Scraper
write_file("src/app/api/v1/cron/scraper/route.ts", """
import { NextResponse } from "next/server";
import { runDiscoveryPipeline } from "@/server/services/automationService";
import { withDb } from "@/server/lib/api-utils";

export async function GET(req: Request) {
  return withDb(async () => {
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }
    const maxResults = Number(process.env.SCRAPER_MAX_RESULTS ?? 20);
    const result = await runDiscoveryPipeline({ maxResults });
    return NextResponse.json({ ok: true, task: "scraper", result });
  });
}
""")

print("Successfully generated Next.js API routes.")
