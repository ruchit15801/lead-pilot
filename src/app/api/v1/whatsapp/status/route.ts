import { NextResponse } from "next/server";
import { whatsappUsage } from "@/server/services/whatsappService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function GET(req: Request) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await whatsappUsage());
  });
}
