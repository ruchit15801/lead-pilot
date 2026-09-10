import { NextResponse } from "next/server";
import { bookMeeting, listMeetings } from "@/server/services/meetingService";
import { withApiAuth } from "@/server/lib/api-utils";

export async function GET(req: Request) {
  return withApiAuth(req, async () => {
    return NextResponse.json(await listMeetings());
  });
}

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const body = await req.json();
    return NextResponse.json(await bookMeeting(String(body?.leadId ?? ""), body?.slot), { status: 201 });
  });
}
