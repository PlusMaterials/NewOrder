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
  // Stacked field: label on its own line, value full-width below — reads well on mobile
  const field = (label: string, value: string) =>
    value
      ? `<tr><td style="padding:10px 20px;border-top:1px solid #f1f5f9">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#64748b;margin-bottom:3px">${label}</div>
          <div style="font-size:15px;color:#0f172a;line-height:1.45;white-space:pre-wrap">${value}</div>
        </td></tr>`
      : "";

  const linkField = (label: string, url: string) =>
    url
      ? `<tr><td style="padding:10px 20px;border-top:1px solid #f1f5f9">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#64748b;margin-bottom:5px">${label}</div>
          <a href="${url}" style="display:inline-block;font-size:14px;font-weight:600;color:#0060A5;text-decoration:none;border:1px solid #0060A5;border-radius:6px;padding:6px 14px">View file</a>
        </td></tr>`
      : "";

  const sectionHeader = (title: string) =>
    `<tr><td style="padding:22px 20px 6px">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#0060A5">${title}</div>
    </td></tr>`;

  const picturesRow = fileLinks.pictures
    ? `<tr><td style="padding:10px 20px;border-top:1px solid #f1f5f9">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#64748b;margin-bottom:6px">Pictures</div>
        ${fileLinks.pictures.split(", ").map((url, i) => `<a href="${url}" style="display:inline-block;font-size:14px;font-weight:600;color:#0060A5;text-decoration:none;border:1px solid #0060A5;border-radius:6px;padding:6px 14px;margin:0 6px 6px 0">Image ${i + 1}</a>`).join("")}
      </td></tr>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f5f8fb;margin:0;padding:16px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#0060A5;padding:22px 20px">
      <h1 style="color:#fff;margin:0;font-size:19px">New Order Submission</h1>
      <p style="color:#cfe4f5;margin:4px 0 0;font-size:13px">Plus Materials — ${new Date().toLocaleString()}</p>
    </div>
    <div style="background:#eff6ff;padding:12px 20px;border-bottom:1px solid #dbeafe">
      <p style="margin:0;font-size:15px;color:#0060A5">
        <strong>Tracking #${trackingNumber}</strong> &nbsp;·&nbsp; Order # to be assigned
      </p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
      <tbody>
        ${sectionHeader("Team")}
        ${field("Buyer", displayName(fields.buyingManager))}
        ${field("Sales Rep", displayName(fields.salesRepresentative))}
        ${field("Secondary Acct. Manager", fields.secondaryAccountManagers?.split(", ").map(displayName).join(", ") || "")}
        ${field("Logistics Manager", fields.logisticsManager === "other"
          ? `${fields.logisticsManagerOtherName} &lt;${fields.logisticsManagerOtherEmail}&gt;`
          : displayName(fields.logisticsManager))}
        ${field("Department", fields.department)}

        ${sectionHeader("Order Details")}
        ${field("Vendor", fields.vendor)}
        ${field("Vendor Contact Email", fields.vendorContactEmail)}
        ${field("Place of Loading", fields.placeOfLoading)}
        ${field("Export Port / Ramp", fields.portRamp)}
        ${field("Product / Grade", fields.productGrade)}
        ${field("HS Code", fields.hsCode)}
        ${field("Purchase Order Items", fields.poItems)}
        ${field("Pricing", fields.pricing)}
        ${field("Min Loading Weight", fields.minimumLoadingWeight)}
        ${field("Purchase Order Shipping Terms", fields.poShippingTerms)}
        ${field("Final Destination", fields.finalDestination)}
        ${field("ICD", fields.icd)}
        ${field("Container / Load Quantity", fields.containerQuantity)}
        ${field("Target Ship Date", fields.targetShipDate)}
        ${field("Customer", fields.customer)}

        ${(fields.soDescription || fields.soPrice || fields.soQty || fields.paymentTerms) ? sectionHeader("Sales Order") : ""}
        ${field("Sales Order Description", fields.soDescription)}
        ${field("Sales Order Price", fields.soPrice)}
        ${field("Sales Order QTY (MT)", fields.soQty)}
        ${field("Payment Terms", fields.paymentTerms)}

        ${fields.additionalNotes ? sectionHeader("Notes") : ""}
        ${field("Additional Notes", fields.additionalNotes)}

        ${(fileLinks.customerBooking || fileLinks.customerPO || fileLinks.pictures) ? sectionHeader("Attachments") : ""}
        ${linkField("Customer Booking", fileLinks.customerBooking)}
        ${linkField("Customer PO", fileLinks.customerPO)}
        ${picturesRow}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

const CC_ALWAYS = [
  "sunaina@plusmaterials.com",
  "sumera@plusmaterials.com",
  "sameera@plusmaterials.com",
];

// CC'd only on loads that require a sales order (Sales Order section shown)
const CC_SALES_ORDER = ["abroo@plusmaterials.com"];

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

  // Add Abroo to CC only when this load requires a sales order
  const ccList = [...CC_ALWAYS];
  if (fields.requiresSalesOrder === "true") ccList.push(...CC_SALES_ORDER);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  await transporter.sendMail({
    // Authenticated as EMAIL_USER, but sent "as" EMAIL_FROM (a verified
    // "Send mail as" alias in that Gmail account). Falls back to EMAIL_USER.
    from: `"Plus Materials Orders" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: Array.from(toSet).join(", "),
    cc: ccList.join(", "),
    subject: `New Order · Tracking #${trackingNumber} — ${fields.vendor || "Unknown Vendor"} · ${fields.department || ""}`,
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
      requiresSalesOrder: getString("requiresSalesOrder"),
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
