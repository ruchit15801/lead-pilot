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
