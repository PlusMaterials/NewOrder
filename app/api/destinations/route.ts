import { NextResponse } from "next/server";
import { google } from "googleapis";

// Column T in the sheet is Final Destination (index 19, 1-based = column T)
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
      range: "Sheet1!T:T",
    });

    const rows = res.data.values ?? [];
    const seen = new Set<string>();
    for (let i = 1; i < rows.length; i++) {
      const val = (rows[i]?.[0] ?? "").toString().trim();
      // Only surface values that aren't one of the fixed domestic options
      if (val && !["PRN SE","Walton Logistics","Plus Savannah","Swift Chicago","Ryder Chicago","Atlantic New Jersey"].includes(val)) {
        seen.add(val);
      }
    }

    const destinations = Array.from(seen).sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ destinations });
  } catch (err) {
    console.error("destinations fetch error:", err);
    return NextResponse.json({ destinations: [] });
  }
}
