import { NextResponse } from "next/server";
import { processDueOutreach } from "@/server/services/outreachService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await processDueOutreach());
  });
}
