import { NextResponse } from "next/server";
import { sendStepToLead } from "@/server/services/outreachService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    return NextResponse.json(await sendStepToLead(String(body?.leadId ?? "")));
  });
}
