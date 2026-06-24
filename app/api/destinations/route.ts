import { NextResponse } from "next/server";
import { google } from "googleapis";

// Column Y in Master List is Final Destination
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
      range: "Master List!Y:Y",
    });

    const rows = res.data.values ?? [];
    const DOMESTIC_PRESETS = new Set([
      "PRN SE","Walton Logistics","Plus Savannah","Swift Chicago","Ryder Chicago","Atlantic New Jersey",
    ]);

    const exportSeen = new Set<string>();
    const domesticOtherSeen = new Set<string>();

    for (let i = 1; i < rows.length; i++) {
      const val = (rows[i]?.[0] ?? "").toString().trim();
      if (!val) continue;
      if (DOMESTIC_PRESETS.has(val)) continue; // skip fixed domestic presets in both lists
      // Heuristic: we can't perfectly distinguish, so surface all custom values in both lists
      exportSeen.add(val);
      domesticOtherSeen.add(val);
    }

    const sort = (s: Set<string>) => Array.from(s).sort((a, b) => a.localeCompare(b));
    return NextResponse.json({
      destinations: sort(exportSeen),          // used by export free-text datalist
      domesticOther: sort(domesticOtherSeen),  // used by domestic Other datalist
    });
  } catch (err) {
    console.error("destinations fetch error:", err);
    return NextResponse.json({ destinations: [] });
  }
}
