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
