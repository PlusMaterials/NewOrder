import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import nodemailer from "nodemailer";
import { Readable } from "stream";

// Columns A–D are filled by the team on individual sheets; E onwards is form data
export const SHEET_HEADERS = [
  "SO Number",
  "SO Status",
  "Invoice Date",
  "Cut-off Date",
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
  "HS Code",
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

// Map logistics manager email → individual sheet name
const LOGISTICS_SHEET: Record<string, string> = {
  "sumera.kajani@plusmaterials.com": "Sumera",
  "rita@plusmaterials.com": "Rita",
  "Sahil@plusmaterials.com": "Sahil",
  "farida.lakhani@plusmaterials.com": "Farida",
};

const NAME_MAP: Record<string, string> = {
  "murad@plusmaterials.com": "Murad",
  "zoeb@plusmaterials.com": "Zoeb",
  "ali@plusmaterials.com": "Ali",
  "ruby@plusmaterials.com": "Ruby",
  "sadaf@plusmaterials.com": "Sadaf",
  "zubair@plusmaterials.com": "Zubair",
  "rita@plusmaterials.com": "Rita",
  "farida.lakhani@plusmaterials.com": "Farida",
  "Sahil@plusmaterials.com": "Sahil",
  "sumera.kajani@plusmaterials.com": "Sumera",
};

function displayName(email: string) {
  return NAME_MAP[email] || email;
}

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ],
  });
}

// Count rows across all individual sheets to determine next tracking number
async function getNextTrackingNumber(auth: ReturnType<typeof getAuth>): Promise<number> {
  const sheets = google.sheets({ version: "v4", auth });
  const sheetId = process.env.GOOGLE_SHEET_ID!;
  const sheetNames = ["Sumera", "Rita", "Sahil", "Farida", "Other"];
  try {
    // Single batchGet instead of one request per sheet
    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: sheetNames.map((name) => `${name}!F:F`), // Tracking # column
    });
    const total = (res.data.valueRanges ?? []).reduce(
      (sum, vr) => sum + Math.max(0, (vr.values?.length ?? 0) - 1), // subtract header row
      0
    );
    return 1001 + total;
  } catch {
    // batchGet fails if any sheet is missing — fall back to per-sheet reads
    let total = 0;
    for (const name of sheetNames) {
      try {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `${name}!F:F`,
        });
        total += Math.max(0, (res.data.values?.length ?? 0) - 1);
      } catch {
        // sheet doesn't exist yet — skip
      }
    }
    return 1001 + total;
  }
}

async function createDriveFolder(
  auth: ReturnType<typeof getAuth>,
  name: string,
  parentFolderId: string
): Promise<string> {
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
  });
  return res.data.id!;
}

async function uploadFileToDrive(
  auth: ReturnType<typeof getAuth>,
  file: File,
  folderId: string
): Promise<string> {
  const drive = google.drive({ version: "v3", auth });
  const buffer = Buffer.from(await file.arrayBuffer());
  const stream = Readable.from(buffer);
  const res = await drive.files.create({
    supportsAllDrives: true,
    requestBody: { name: file.name, parents: [folderId] },
    media: { mimeType: file.type || "application/octet-stream", body: stream },
    fields: "id,webViewLink",
  });
  await drive.permissions.create({
    fileId: res.data.id!,
    supportsAllDrives: true,
    requestBody: { role: "reader", type: "anyone" },
  });
  return res.data.webViewLink || `https://drive.google.com/file/d/${res.data.id}/view`;
}

// Ensure an individual sheet exists and has the correct headers
async function ensureIndividualSheet(auth: ReturnType<typeof getAuth>, sheetName: string) {
  const sheets = google.sheets({ version: "v4", auth });
  const sheetId = process.env.GOOGLE_SHEET_ID!;

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const exists = spreadsheet.data.sheets?.some((s) => s.properties?.title === sheetName);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
    });
  }

  // Always keep headers in sync
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [SHEET_HEADERS] },
  });
}

async function appendToIndividualSheet(
  auth: ReturnType<typeof getAuth>,
  sheetName: string,
  row: string[]
) {
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: `${sheetName}!A:AI`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
}

function buildEmailHtml(
  trackingNumber: number,
  fields: Record<string, string>,
  fileLinks: Record<string, string>
) {
  const row = (label: string, value: string) =>
    value
      ? `<tr><td style="padding:8px 12px;font-weight:600;color:#374151;white-space:nowrap;vertical-align:top;width:200px">${label}</td><td style="padding:8px 12px;color:#111827">${value}</td></tr>`
      : "";

  const linkRow = (label: string, url: string) =>
    url
      ? `<tr><td style="padding:8px 12px;font-weight:600;color:#374151;white-space:nowrap;vertical-align:top;width:200px">${label}</td><td style="padding:8px 12px"><a href="${url}" style="color:#2563eb">View file</a></td></tr>`
      : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:24px">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#0077B2;padding:24px 32px">
      <h1 style="color:#fff;margin:0;font-size:20px">New Order Submission</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">Plus Materials — ${new Date().toLocaleString()}</p>
    </div>
    <div style="background:#eff6ff;padding:12px 32px;border-bottom:1px solid #dbeafe">
      <p style="margin:0;font-size:14px;color:#1e40af">
        <strong>Tracking #${trackingNumber}</strong> &nbsp;·&nbsp; Order # to be assigned
      </p>
    </div>
    <div style="padding:24px 32px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tbody>
          ${row("Buyer", displayName(fields.buyingManager))}
          ${row("Sales Rep", displayName(fields.salesRepresentative))}
          ${row("Secondary Acct. Manager", fields.secondaryAccountManagers?.split(", ").map(displayName).join(", ") || "")}
          ${row("Logistics Manager", fields.logisticsManager === "other"
            ? `${fields.logisticsManagerOtherName} &lt;${fields.logisticsManagerOtherEmail}&gt;`
            : displayName(fields.logisticsManager))}
          ${row("Department", fields.department)}
          <tr><td colspan="2" style="padding:4px 0"><hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0"></td></tr>
          ${row("Vendor", fields.vendor)}
          ${row("Vendor Contact Email", fields.vendorContactEmail)}
          ${row("Place of Loading", fields.placeOfLoading)}
          ${row("Export Port / Ramp", fields.portRamp)}
          ${row("Product / Grade", fields.productGrade)}
          ${row("HS Code", fields.hsCode)}
          ${row("Purchase Order Items", fields.poItems)}
          ${row("Pricing", fields.pricing)}
          ${linkRow("Customer Booking", fileLinks.customerBooking)}
          ${linkRow("Customer PO", fileLinks.customerPO)}
          ${row("Min Loading Weight", fields.minimumLoadingWeight)}
          ${row("Purchase Order Shipping Terms", fields.poShippingTerms)}
          ${row("Final Destination", fields.finalDestination)}
          ${row("ICD", fields.icd)}
          ${row("Container / Load Quantity", fields.containerQuantity)}
          ${row("Target Ship Date", fields.targetShipDate)}
          ${row("Customer", fields.customer)}
          <tr><td colspan="2" style="padding:4px 0"><hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0"></td></tr>
          ${row("Sales Order Description", fields.soDescription)}
          ${row("Sales Order Price", fields.soPrice)}
          ${row("Sales Order QTY (MT)", fields.soQty)}
          ${row("Payment Terms", fields.paymentTerms)}
          ${row("Additional Notes", fields.additionalNotes)}
          ${fileLinks.pictures ? `<tr><td style="padding:8px 12px;font-weight:600;color:#374151;vertical-align:top">Pictures</td><td style="padding:8px 12px">${fileLinks.pictures.split(", ").map((url, i) => `<a href="${url}" style="color:#2563eb">Image ${i + 1}</a>`).join(" &nbsp; ")}</td></tr>` : ""}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

const CC_ALWAYS = [
  "sunaina@plusmaterials.com",
  "sumera@plusmaterials.com",
  "sameera@plusmaterials.com",
];

interface FileAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

async function sendEmail(
  trackingNumber: number,
  fields: Record<string, string>,
  fileLinks: Record<string, string>,
  attachments: FileAttachment[]
) {
  const toSet = new Set<string>();
  if (fields.buyingManager) toSet.add(fields.buyingManager);
  if (fields.salesRepresentative) toSet.add(fields.salesRepresentative);
  if (fields.secondaryAccountManagers) {
    fields.secondaryAccountManagers.split(", ").filter(Boolean).forEach((e) => toSet.add(e));
  }
  if (fields.logisticsManager && fields.logisticsManager !== "other") {
    toSet.add(fields.logisticsManager);
  } else if (fields.logisticsManager === "other" && fields.logisticsManagerOtherEmail) {
    toSet.add(fields.logisticsManagerOtherEmail);
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  await transporter.sendMail({
    from: `"Plus Materials Orders" <${process.env.EMAIL_USER}>`,
    to: Array.from(toSet).join(", "),
    cc: CC_ALWAYS.join(", "),
    subject: `[#${trackingNumber}] New Order — ${fields.vendor || "Unknown Vendor"} · ${fields.department || ""}`,
    html: buildEmailHtml(trackingNumber, fields, fileLinks),
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const getString = (key: string) => (formData.get(key) as string) || "";

    const fields: Record<string, string> = {
      buyingManager: getString("buyingManager"),
      salesRepresentative: getString("salesRepresentative"),
      secondaryAccountManagers: getString("secondaryAccountManagers"),
      logisticsManager: getString("logisticsManager"),
      logisticsManagerOtherName: getString("logisticsManagerOtherName"),
      logisticsManagerOtherEmail: getString("logisticsManagerOtherEmail"),
      department: getString("department"),
      vendor: getString("vendor"),
      vendorContactEmail: getString("vendorContactEmail"),
      placeOfLoading: getString("placeOfLoading"),
      portRamp: getString("portRamp"),
      productGrade: getString("productGrade"),
      hsCode: getString("hsCode"),
      poItems: getString("poItems"),
      pricing: getString("pricing"),
      minimumLoadingWeight: getString("minimumLoadingWeight"),
      poShippingTerms: getString("poShippingTerms"),
      finalDestination: getString("finalDestination"),
      icd: getString("icd"),
      containerQuantity: getString("containerQuantity"),
      targetShipDate: getString("targetShipDate"),
      customer: getString("customer"),
      soDescription: getString("soDescription"),
      soPrice: getString("soPrice"),
      soQty: getString("soQty"),
      paymentTerms: getString("paymentTerms"),
      additionalNotes: getString("additionalNotes"),
    };

    const auth = getAuth();
    const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;

    const trackingNumber = await getNextTrackingNumber(auth);

    const orderFolderId = await createDriveFolder(
      auth,
      `#${trackingNumber} — ${fields.vendor || "Order"}`,
      rootFolderId
    );

    const customerBookingFile = formData.get("customerBooking") as File | null;
    const customerPOFile = formData.get("customerPO") as File | null;
    const pictureFiles = (formData.getAll("pictures") as File[]).filter((p) => p.size);

    // Read all file buffers and upload everything to Drive concurrently
    const bufferFor = async (file: File): Promise<FileAttachment> => ({
      filename: file.name,
      content: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || "application/octet-stream",
    });

    const [customerBookingLink, customerPOLink, picLinks, attachments] = await Promise.all([
      customerBookingFile?.size ? uploadFileToDrive(auth, customerBookingFile, orderFolderId) : Promise.resolve(""),
      customerPOFile?.size ? uploadFileToDrive(auth, customerPOFile, orderFolderId) : Promise.resolve(""),
      Promise.all(pictureFiles.map((pic) => uploadFileToDrive(auth, pic, orderFolderId))),
      Promise.all(
        [
          ...(customerBookingFile?.size ? [customerBookingFile] : []),
          ...(customerPOFile?.size ? [customerPOFile] : []),
          ...pictureFiles,
        ].map(bufferFor)
      ),
    ]);

    const fileLinks = {
      customerBooking: customerBookingLink,
      customerPO: customerPOLink,
      pictures: picLinks.join(", "),
    };

    const logisticsDisplay =
      fields.logisticsManager === "other"
        ? `${fields.logisticsManagerOtherName} <${fields.logisticsManagerOtherEmail}>`
        : displayName(fields.logisticsManager);

    // Determine which individual sheet this submission belongs to
    const targetSheet = LOGISTICS_SHEET[fields.logisticsManager] ?? "Other";

    // Row: A–D empty (team fills these), E–AI form data
    const row = [
      "", // SO Number
      "", // SO Status
      "", // Invoice Date
      "", // Cut-off Date
      new Date().toISOString(),
      String(trackingNumber),
      "", // Order # — filled by team
      displayName(fields.buyingManager),
      displayName(fields.salesRepresentative),
      fields.secondaryAccountManagers.split(", ").map(displayName).join(", "),
      logisticsDisplay,
      fields.department,
      fields.vendor,
      fields.vendorContactEmail,
      fields.placeOfLoading,
      fields.portRamp,
      fields.productGrade,
      fields.hsCode,
      fields.poItems,
      fields.pricing,
      customerBookingLink,
      customerPOLink,
      fields.minimumLoadingWeight,
      fields.poShippingTerms,
      fields.finalDestination,
      fields.icd,
      fields.containerQuantity,
      fields.targetShipDate,
      fields.customer,
      fields.soDescription,
      fields.soPrice,
      fields.soQty,
      fields.paymentTerms,
      fields.additionalNotes,
      picLinks.join(", "),
    ];

    // Sheet append (after ensuring the sheet exists) and email are independent — run them in parallel
    await Promise.all([
      ensureIndividualSheet(auth, targetSheet).then(() =>
        appendToIndividualSheet(auth, targetSheet, row)
      ),
      sendEmail(trackingNumber, fields, fileLinks, attachments),
    ]);

    return NextResponse.json({ success: true, trackingNumber });
  } catch (err) {
    console.error("Order submission error:", err);
    return NextResponse.json({ error: "Failed to submit order" }, { status: 500 });
  }
}
