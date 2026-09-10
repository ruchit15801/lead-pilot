import { NextResponse } from "next/server";
import { getLead, patchLead, deleteLead } from "@/server/services/leadService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await getLead(params.id));
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    return NextResponse.json(await patchLead(params.id, body));
  });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await deleteLead(params.id));
  });
}
