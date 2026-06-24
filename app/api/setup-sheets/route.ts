import { NextResponse } from "next/server";
import { google } from "googleapis";
import { SHEET_HEADERS } from "../submit-order/route";

const MASTER = "Master List";

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

// Col6 = Tracking # in the new 35-col layout
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

    // ── 1. Get existing sheets ────────────────────────────────────────────────
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const existingSheets = spreadsheet.data.sheets ?? [];
    const existingTitles = new Set(existingSheets.map((s) => s.properties?.title ?? ""));

    // Find the source sheet — either already renamed or still called Sheet1
    const sourceTitle = existingTitles.has(MASTER) ? MASTER : "Sheet1";
    const sourceSheetMeta = existingSheets.find((s) => s.properties?.title === sourceTitle);
    const sourceSheetNumericId = sourceSheetMeta?.properties?.sheetId;

    // ── 2. Read existing source sheet data ───────────────────────────────────
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sourceTitle}!A:AI`,
    });
    const allRows = existing.data.values ?? [];
    const dataRows = allRows.slice(1).filter((r) => r.some((c) => c !== ""));

    // Detect whether source still has old layout (no SO Number col yet)
    // Old layout: col0=Timestamp, col6=LogisticsManager
    // New layout: col0=SO Number, col4=Timestamp, col10=LogisticsManager
    const firstHeader = (allRows[0]?.[0] ?? "").toString();
    const isOldLayout = firstHeader === "Timestamp";
    const LOGISTICS_COL = isOldLayout ? 6 : 10;

    // ── 3. Create individual sheets that don't exist yet ──────────────────────
    const individualSheets = ["Sumera", "Rita", "Sahil", "Farida", "Other"];
    const sheetsToCreate = individualSheets.filter((n) => !existingTitles.has(n));

    const batchRequests: object[] = [];

    if (sheetsToCreate.length > 0) {
      sheetsToCreate.forEach((title) =>
        batchRequests.push({ addSheet: { properties: { title } } })
      );
    }

    // Rename Sheet1 → Master List if not already done
    if (sourceTitle === "Sheet1" && sourceSheetNumericId !== undefined) {
      batchRequests.push({
        updateSheetProperties: {
          properties: { sheetId: sourceSheetNumericId, title: MASTER },
          fields: "title",
        },
      });
    }

    if (batchRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests: batchRequests },
      });
    }

    // ── 4. Write headers to all individual sheets ─────────────────────────────
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: individualSheets.map((name) => ({ range: `${name}!A1`, values: [SHEET_HEADERS] })),
      },
    });

    // ── 5. Migrate existing data rows to individual sheets ────────────────────
    const buckets: Record<string, string[][]> = {};
    for (const name of individualSheets) buckets[name] = [];

    for (const row of dataRows) {
      const logisticsName = (row[LOGISTICS_COL] ?? "").toString();
      const target = sheetFromDisplay(logisticsName);
      // If old layout, prepend 4 empty cells for the new manual columns
      buckets[target].push(isOldLayout ? ["", "", "", "", ...row] : [...row]);
    }

    const migrationUpdates = Object.entries(buckets)
      .filter(([, rows]) => rows.length > 0)
      .map(([name, rows]) => ({ range: `${name}!A2`, values: rows }));

    if (migrationUpdates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { valueInputOption: "RAW", data: migrationUpdates },
      });
    }

    // ── 6. Rebuild Master List as consolidated view ───────────────────────────
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

    return NextResponse.json({
      success: true,
      migratedRows: dataRows.length,
      sheetsCreated: sheetsToCreate,
      renamed: sourceTitle === "Sheet1",
      message: `${MASTER} is now a consolidated view. Individual sheets: ${individualSheets.join(", ")}.`,
    });
  } catch (err) {
    console.error("setup-sheets error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
