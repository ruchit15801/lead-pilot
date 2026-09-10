import { NextResponse } from "next/server";
import { dashboardStats } from "@/server/services/dashboardService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function GET(req: Request) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await dashboardStats());
  });
}
