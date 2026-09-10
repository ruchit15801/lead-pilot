import { NextResponse } from "next/server";
import Papa from "papaparse";
import { importLeads } from "@/server/services/leadService";
import { ValidationError } from "@/server/lib/errors";
import { withApiAuth } from "@/server/lib/api-utils";

export async function POST(req: Request) {
  return withApiAuth(req, async () => {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      throw new ValidationError("CSV file is required");
    }
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    });
    const rows = parsed.data.map((row) => ({
      name: row.name,
      company: row.company,
      role: row.role,
      email: row.email,
      phone: row.phone,
      source: row.source || "csv",
      service: row.service,
    }));
    return NextResponse.json(await importLeads(rows));
  });
}
