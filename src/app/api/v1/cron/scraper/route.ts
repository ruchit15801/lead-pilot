import { NextResponse } from "next/server";
import { runDiscoveryPipeline } from "@/server/services/automationService";
import { withDb } from "@/server/lib/api-utils";

export async function GET(req: Request) {
  return withDb(async () => {
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const maxResults = Number(process.env.SCRAPER_MAX_RESULTS ?? 20);
    const result = await runDiscoveryPipeline({ maxResults });
    return NextResponse.json({ ok: true, task: "scraper", result });
  });
}
