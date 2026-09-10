import { NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import { addAttachment } from "@/server/services/dashboardService";
import { ValidationError } from "@/server/lib/errors";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      throw new ValidationError("File is required");
    }
    
    // In a real Vercel app, use Vercel Blob. For now, writing to tmp or local disk if not Vercel.
    const isVercel = process.env.VERCEL === '1';
    const uploadDir = isVercel ? '/tmp' : path.join(process.cwd(), "data", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const storedName = file.name ? `${uniqueSuffix}-${file.name}` : uniqueSuffix;
    const filePath = path.join(uploadDir, storedName);
    
    await fs.writeFile(filePath, buffer);

    return NextResponse.json(
      await addAttachment({
        name: file.name || "unknown",
        storedName: storedName,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      }),
      { status: 201 }
    );
  });
}
