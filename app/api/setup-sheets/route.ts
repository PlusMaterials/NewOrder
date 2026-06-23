import { NextResponse } from "next/server";
import { google } from "googleapis";
import { SHEET_HEADERS } from "../submit-order/route";

// Individual sheet names mapped from logistics manager display names
const DISPLAY_TO_SHEET: [string, string][] = [
  ["Sumera", "Sumera"],
  ["Rita", "Rita"],
  ["Sahil", "Sahil"],
  ["Farida", "Farida"],
];

function sheetFromDisplay(name: string): string {
  for (const [key, sheet] of DISPLAY_TO_SHEET) {
    if (name.includes(key)) return sheet;
  }
  return "Other";
}

// Sheet1!A2 consolidation formula — pulls all individual sheets into one view
// Col6 = Tracking # (non-empty = real data row), ordered ascending by tracking number
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

export async function GET() {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const sheetId = process.env.GOOGLE_SHEET_ID!;

    // ── 1. Read existing Sheet1 data ──────────────────────────────────────────
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Sheet1!A:AI",
    });
    const allRows = existing.data.values ?? [];
    // Row 0 is the current header; rows 1+ are data
    const dataRows = allRows.slice(1).filter((r) => r.some((c) => c !== ""));

    // Current Sheet1 col indices (before restructure):
    // 0=Timestamp, 1=Tracking#, 2=Order#, 3=Buyer, 4=SalesRep,
    // 5=SecondaryAMs, 6=LogisticsManager, 7=Department, ...
    const LOGISTICS_COL = 6;

    // ── 2. Get existing sheets ────────────────────────────────────────────────
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const existingSheetTitles = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title ?? "") ?? []
    );

    // ── 3. Create individual sheets that don't exist yet ──────────────────────
    const individualSheets = ["Sumera", "Rita", "Sahil", "Farida", "Other"];
    const sheetsToCreate = individualSheets.filter((n) => !existingSheetTitles.has(n));

    if (sheetsToCreate.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: sheetsToCreate.map((title) => ({
            addSheet: { properties: { title } },
          })),
        },
      });
    }

    // ── 4. Write headers to all individual sheets ─────────────────────────────
    const headerUpdates = individualSheets.map((name) => ({
      range: `${name}!A1`,
      values: [SHEET_HEADERS],
    }));
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { valueInputOption: "RAW", data: headerUpdates },
    });

    // ── 5. Migrate existing Sheet1 rows to individual sheets ──────────────────
    // Bucket rows by target sheet
    const buckets: Record<string, string[][]> = {};
    for (const name of individualSheets) buckets[name] = [];

    for (const row of dataRows) {
      const logisticsName = (row[LOGISTICS_COL] ?? "").toString();
      const target = sheetFromDisplay(logisticsName);
      // Prepend 4 empty cells (SO Number, SO Status, Invoice Date, Cut-off Date)
      buckets[target].push(["", "", "", "", ...row]);
    }

    // Write each bucket to its sheet (append after header)
    const migrationUpdates = Object.entries(buckets)
      .filter(([, rows]) => rows.length > 0)
      .map(([name, rows]) => ({ range: `${name}!A2`, values: rows }));

    if (migrationUpdates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { valueInputOption: "RAW", data: migrationUpdates },
      });
    }

    // ── 6. Rebuild Sheet1 as a consolidated view ──────────────────────────────
    // Clear Sheet1 rows 2+ (keep row 1 for now)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: "Sheet1!A2:AZ",
    });

    // Write new 35-col headers to Sheet1 row 1
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "Sheet1!A1",
      valueInputOption: "RAW",
      requestBody: { values: [SHEET_HEADERS] },
    });

    // Write consolidation formula to Sheet1!A2
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "Sheet1!A2",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[CONSOLIDATION_FORMULA]] },
    });

    return NextResponse.json({
      success: true,
      migratedRows: dataRows.length,
      sheetsCreated: sheetsToCreate,
      message: "Sheet1 is now a consolidated view. Individual sheets: Sumera, Rita, Sahil, Farida, Other.",
    });
  } catch (err) {
    console.error("setup-sheets error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
