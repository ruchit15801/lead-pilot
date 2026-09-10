import { NextResponse } from "next/server";
import { onboardAgency } from "@/server/services/agencyService";
import { ValidationError } from "@/server/lib/errors";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    const url = String(body?.url ?? "");
    if (!url || !url.startsWith("http")) throw new ValidationError("Valid URL is required");
    return NextResponse.json(await onboardAgency(url));
  });
}
