import { NextResponse } from "next/server";
import { google } from "googleapis";
import { SHEET_HEADERS } from "../submit-order/route";

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const sheetId = process.env.GOOGLE_SHEET_ID!;

    // Sync headers on all individual sheets and Sheet1
    const targets = ["Sumera", "Rita", "Sahil", "Farida", "Other", "Sheet1"];
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: targets.map((name) => ({ range: `${name}!A1`, values: [SHEET_HEADERS] })),
      },
    });

    return NextResponse.json({ success: true, headers: SHEET_HEADERS });
  } catch (err) {
    console.error("fix-headers error:", err);
    return NextResponse.json({ error: "Failed to update headers" }, { status: 500 });
  }
}
