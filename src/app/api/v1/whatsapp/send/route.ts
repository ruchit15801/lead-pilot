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
