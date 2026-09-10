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
