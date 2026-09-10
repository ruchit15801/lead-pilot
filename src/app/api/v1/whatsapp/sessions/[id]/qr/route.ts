import { NextResponse } from "next/server";
import { getQr } from "@/server/services/whatsappService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await getQr(params.id));
  });
}
