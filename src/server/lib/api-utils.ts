import { NextResponse } from "next/server";
import { AppError } from "./errors";
import { connectDatabase } from "../store";
import { ensureSeeded } from "../services/leadService";

// Helper to ensure database is connected and seeded before handling a request
export async function withDb(handler: () => Promise<NextResponse>) {
  try {
    await connectDatabase();
    // Only seed if needed (ensureSeeded has its own checks)
    await ensureSeeded();
    return await handler();
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message, details: error.details } },
        { status: error.statusCode }
      );
    }
    console.error("API Route Error", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Internal server error" } },
      { status: 500 }
    );
  }
}

// Helper to require API key
export async function withApiAuth(req: Request, handler: () => Promise<NextResponse>) {
  const expected = process.env.API_KEY ?? "axoryte-dev-key";
  const header = req.headers.get("x-api-key");
  if (header !== expected) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Invalid API key" } }, { status: 401 });
  }
  return withDb(handler);
}

export function str(value: unknown) {
  return typeof value === "string" && value.length ? value : undefined;
}
