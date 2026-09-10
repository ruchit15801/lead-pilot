import { NextResponse } from "next/server";
import { patchCampaign } from "@/server/services/campaignService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    return NextResponse.json(await patchCampaign(params.id, body?.status));
  });
}
