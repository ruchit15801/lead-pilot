import { NextResponse } from "next/server";
import { processDueOutreach } from "@/server/services/outreachService";
import { withDb } from "@/server/lib/api-utils";

export async function GET(req: Request) {
  return withDb(async () => {
    // Optionally check authorization header (Vercel Cron securely passes a token)
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await processDueOutreach();
    return NextResponse.json({ ok: true, task: "outreach" });
  });
}
