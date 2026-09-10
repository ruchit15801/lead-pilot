import { NextResponse } from "next/server";
import { googleAuthUrl, googleConfigured } from "@/server/services/googleService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function GET(req: Request) {
  return withApiAuth(req, async () => {
    return NextResponse.json({ url: googleAuthUrl(), configured: googleConfigured() });
  });
}
