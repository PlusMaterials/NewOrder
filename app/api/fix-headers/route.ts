import { NextResponse } from "next/server";
import { google } from "googleapis";

const SHEET_HEADERS = [
  "Timestamp",
  "Tracking #",
  "Order #",
  "Buyer",
  "Sales Rep",
  "Secondary Account Managers",
  "Logistics Manager",
  "Department",
  "Vendor",
  "Vendor Contact Email",
  "Place of Loading",
  "Export Port / Ramp",
  "Product / Grade",
  "Purchase Order Items",
  "Pricing",
  "Customer Booking",
  "Customer PO",
  "Min Loading Weight",
  "Purchase Order Shipping Terms",
  "Final Destination",
  "ICD",
  "Container / Load Quantity",
  "Target Ship Date",
  "Customer",
  "Sales Order Description",
  "Sales Order Price",
  "Sales Order QTY (MT)",
  "Payment Terms",
  "Additional Notes",
  "Pictures",
];

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

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: "Sheet1!A1",
      valueInputOption: "RAW",
      requestBody: { values: [SHEET_HEADERS] },
    });

    return NextResponse.json({ success: true, headers: SHEET_HEADERS });
  } catch (err) {
    console.error("fix-headers error:", err);
    return NextResponse.json({ error: "Failed to update headers" }, { status: 500 });
  }
}
