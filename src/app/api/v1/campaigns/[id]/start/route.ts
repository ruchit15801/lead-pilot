import { NextResponse } from "next/server";
import { startCampaign } from "@/server/services/campaignService";
import { processDueOutreach } from "@/server/services/outreachService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withApiAuth(req, async () => {
    const result = await startCampaign(params.id);
    await processDueOutreach();
    return NextResponse.json({ status: result.status });
  });
}
