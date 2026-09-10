import { NextResponse } from "next/server";
import { health } from "@/server/services/dashboardService";
import { withDb } from "@/server/lib/api-utils";

export async function GET() {
  return withDb(async () => {
    return NextResponse.json(await health());
  });
}
