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
