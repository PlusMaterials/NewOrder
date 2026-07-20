import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { SHEET_HEADERS } from "../submit-order/route";

const MASTER = "Master List";
const INDIVIDUAL_SHEETS = ["Sumera", "Rita", "Sahil", "Farida", "Other"];

// Consolidation formula for the Master List — mirrors setup-sheets
const CONSOLIDATION_FORMULA =
  `=IFERROR(QUERY({Sumera!A2:AI;Rita!A2:AI;Sahil!A2:AI;Farida!A2:AI;Other!A2:AI},"SELECT * WHERE Col6 IS NOT NULL ORDER BY Col6 ASC",0),"")`;

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

// Clears all data rows (row 2+) from every individual sheet, keeping headers.
// Requires ?confirm=yes so it can't be triggered by accident.
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("confirm") !== "yes") {
    return NextResponse.json(
      {
        error: "Confirmation required",
        message:
          "This permanently deletes ALL order entries from every sheet. " +
          "If you are sure, re-run with ?confirm=yes appended to the URL.",
      },
      { status: 400 }
    );
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const sheetId = process.env.GOOGLE_SHEET_ID!;

    // Only clear sheets that actually exist
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const existingTitles = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title ?? "") ?? []
    );

    // 1. Clear data rows (A2:AZ) from each individual sheet, keep header row
    const sheetsToClear = INDIVIDUAL_SHEETS.filter((n) => existingTitles.has(n));
    if (sheetsToClear.length > 0) {
      await sheets.spreadsheets.values.batchClear({
        spreadsheetId: sheetId,
        requestBody: { ranges: sheetsToClear.map((n) => `${n}!A2:AZ`) },
      });
    }

    // 2. Re-assert headers on every individual sheet
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: sheetsToClear.map((n) => ({ range: `${n}!A1`, values: [SHEET_HEADERS] })),
      },
    });

    // 3. Rebuild the Master List (clear old data, restore header + formula)
    if (existingTitles.has(MASTER)) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: `${MASTER}!A2:AZ`,
      });
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: [
            { range: `${MASTER}!A1`, values: [SHEET_HEADERS] },
            { range: `${MASTER}!A2`, values: [[CONSOLIDATION_FORMULA]] },
          ],
        },
      });
    }

    return NextResponse.json({
      success: true,
      cleared: sheetsToClear,
      message: "All order entries removed. Tracking numbers will restart at 1001.",
    });
  } catch (err) {
    console.error("reset-sheets error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
