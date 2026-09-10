import { NextResponse } from "next/server";
import { getSettings } from "@/server/services/dashboardService";
import { setIntegrationFlags } from "@/server/services/googleService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function GET(req: Request) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await getSettings());
  });
}

export async function PATCH(req: Request) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    return NextResponse.json(await setIntegrationFlags(body ?? {}));
  });
}
