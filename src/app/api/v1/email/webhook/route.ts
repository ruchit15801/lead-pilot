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
