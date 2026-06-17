import { NextResponse } from "next/server";
import { google } from "googleapis";

// Columns I and J in the sheet are Vendor and Vendor Contact Email
export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: "Sheet1!I:J",
    });

    const rows = res.data.values ?? [];
    // Skip header row, collect the most recent email per distinct vendor name
    const map = new Map<string, string>();
    for (let i = 1; i < rows.length; i++) {
      const vendor = (rows[i]?.[0] ?? "").toString().trim();
      const email = (rows[i]?.[1] ?? "").toString().trim();
      if (!vendor) continue;
      // Later rows overwrite earlier ones, keeping the most recent email
      map.set(vendor.toLowerCase(), JSON.stringify({ vendor, email }));
    }

    const vendors = Array.from(map.values())
      .map((v) => JSON.parse(v) as { vendor: string; email: string })
      .sort((a, b) => a.vendor.localeCompare(b.vendor));

    return NextResponse.json({ vendors });
  } catch (err) {
    console.error("vendors fetch error:", err);
    return NextResponse.json({ vendors: [] });
  }
}
