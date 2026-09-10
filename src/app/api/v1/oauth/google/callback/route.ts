import { NextResponse } from "next/server";
import { handleGoogleCallback } from "@/server/services/googleService";
import { ValidationError } from "@/server/lib/errors";
import { withDb } from "@/server/lib/api-utils";

export async function GET(req: Request) {
  return withDb(async () => {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    if (!code) throw new ValidationError("Missing OAuth code");
    await handleGoogleCallback(code);
    return NextResponse.redirect(process.env.WEB_ORIGIN ?? "http://localhost:3000/dashboard/settings?google=connected");
  });
}
