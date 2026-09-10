import { NextResponse } from "next/server";
import { sandboxConnect } from "@/server/services/whatsappService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await sandboxConnect(params.id));
  });
}
