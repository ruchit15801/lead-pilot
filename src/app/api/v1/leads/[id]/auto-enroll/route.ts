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
