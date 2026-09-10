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
