import { NextResponse } from "next/server";
import { createCampaign, listCampaigns } from "@/server/services/campaignService";
import { ValidationError } from "@/server/lib/errors";
import { withApiAuth } from "@/server/lib/api-utils";
import type { ServiceTarget } from "@/lib/types";

export async function GET(req: Request) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await listCampaigns());
  });
}

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    const serviceTarget = body?.serviceTarget as ServiceTarget;
    if (!serviceTarget) throw new ValidationError("Invalid serviceTarget");
    return NextResponse.json(
      await createCampaign({
        name: String(body?.name ?? ""),
        serviceTarget,
        leadIds: Array.isArray(body?.leadIds) ? body.leadIds : [],
        sequence: body?.sequence,
      }),
      { status: 201 }
    );
  });
}
