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
