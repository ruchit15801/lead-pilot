import { NextResponse } from "next/server";
import { runDiscoveryPipeline } from "@/server/services/automationService";
import { withApiAuth } from "@/server/lib/api-utils";

export const maxDuration = 60; // Fix: Allow 60s max execution time on Vercel

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    const maxResults = Number(body?.maxResults ?? process.env.SCRAPER_MAX_RESULTS ?? 20);
    const result = await runDiscoveryPipeline({ maxResults });
    return NextResponse.json(result);
  });
}
