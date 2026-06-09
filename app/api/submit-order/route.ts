import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import nodemailer from "nodemailer";
import { Readable } from "stream";

const SHEET_HEADERS = [
  "Timestamp",
  "Buying Manager",
  "Sales Representative",
  "Secondary Account Managers",
  "Logistics Manager",
  "Department",
  "Vendor",
  "Place of Loading (FOB)",
  "Port / Ramp of Loading",
  "Product / Grade",
  "PO Items",
  "Pricing",
  "Customer Booking",
  "Customer PO",
  "Min Loading Weight",
  "PO Shipping Terms",
  "Final Destination",
  "ICD",
  "Container Quantity",
  "Target Ship Date",
  "Customer",
  "SO Description",
  "SO Price",
  "SO QTY (MT)",
  "Payment Terms",
  "Additional Notes",
  "Pictures",
];

// Name lookup for display in emails
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

async function uploadFileToDrive(
  auth: ReturnType<typeof getAuth>,
  file: File,
  folderId: string
): Promise<string> {
  const drive = google.drive({ version: "v3", auth });
  const buffer = Buffer.from(await file.arrayBuffer());
  const stream = Readable.from(buffer);

  const res = await drive.files.create({
    // supportsAllDrives is required for Shared Drive uploads
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

async function appendToSheet(auth: ReturnType<typeof getAuth>, row: string[]) {
  const sheets = google.sheets({ version: "v4", auth });
  const sheetId = process.env.GOOGLE_SHEET_ID!;

  const check = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Sheet1!A1:A1",
  });

  if (!check.data.values?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "Sheet1!A1",
      valueInputOption: "RAW",
      requestBody: { values: [SHEET_HEADERS] },
    });
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Sheet1!A:Z",
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
}

function buildEmailHtml(fields: Record<string, string>, fileLinks: Record<string, string>) {
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
    <div style="background:#2563eb;padding:24px 32px">
      <h1 style="color:#fff;margin:0;font-size:20px">New Order Submission</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">Plus Materials — ${new Date().toLocaleString()}</p>
    </div>
    <div style="padding:24px 32px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tbody>
          ${row("Buying Manager", displayName(fields.buyingManager))}
          ${row("Sales Representative", displayName(fields.salesRepresentative))}
          ${row("Secondary Acct. Manager", fields.secondaryAccountManagers?.split(", ").map(displayName).join(", ") || "")}
          ${row("Logistics Manager", fields.logisticsManager === "other"
            ? `${fields.logisticsManagerOtherName} &lt;${fields.logisticsManagerOtherEmail}&gt;`
            : displayName(fields.logisticsManager))}
          ${row("Department", fields.department)}
          <tr><td colspan="2" style="padding:4px 0"><hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0"></td></tr>
          ${row("Vendor", fields.vendor)}
          ${row("Place of Loading", fields.placeOfLoading)}
          ${row("Port / Ramp", fields.portRamp)}
          ${row("Product / Grade", fields.productGrade)}
          ${row("PO Items", fields.poItems)}
          ${row("Pricing", fields.pricing)}
          ${linkRow("Customer Booking", fileLinks.customerBooking)}
          ${linkRow("Customer PO", fileLinks.customerPO)}
          ${row("Min Loading Weight", fields.minimumLoadingWeight)}
          ${row("PO Shipping Terms", fields.poShippingTerms)}
          ${row("Final Destination", fields.finalDestination)}
          ${row("ICD", fields.icd)}
          ${row("Container Quantity", fields.containerQuantity)}
          ${row("Target Ship Date", fields.targetShipDate)}
          ${row("Customer", fields.customer)}
          <tr><td colspan="2" style="padding:4px 0"><hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0"></td></tr>
          ${row("SO Description", fields.soDescription)}
          ${row("SO Price", fields.soPrice)}
          ${row("SO QTY (MT)", fields.soQty)}
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

async function sendEmail(fields: Record<string, string>, fileLinks: Record<string, string>) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Plus Materials Orders" <${process.env.EMAIL_USER}>`,
    to: "zoeb@plusmaterials.com",
    subject: `New Order — ${fields.vendor || "Unknown Vendor"} · ${fields.department || ""}`,
    html: buildEmailHtml(fields, fileLinks),
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
      placeOfLoading: getString("placeOfLoading"),
      portRamp: getString("portRamp"),
      productGrade: getString("productGrade"),
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
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;

    const customerBookingFile = formData.get("customerBooking") as File | null;
    const customerPOFile = formData.get("customerPO") as File | null;
    const pictureFiles = formData.getAll("pictures") as File[];

    let customerBookingLink = "";
    let customerPOLink = "";
    const picLinks: string[] = [];

    if (customerBookingFile?.size) {
      customerBookingLink = await uploadFileToDrive(auth, customerBookingFile, folderId);
    }
    if (customerPOFile?.size) {
      customerPOLink = await uploadFileToDrive(auth, customerPOFile, folderId);
    }
    for (const pic of pictureFiles) {
      if (pic.size) picLinks.push(await uploadFileToDrive(auth, pic, folderId));
    }

    const fileLinks = {
      customerBooking: customerBookingLink,
      customerPO: customerPOLink,
      pictures: picLinks.join(", "),
    };

    const logisticsDisplay =
      fields.logisticsManager === "other"
        ? `${fields.logisticsManagerOtherName} <${fields.logisticsManagerOtherEmail}>`
        : displayName(fields.logisticsManager);

    const row = [
      new Date().toISOString(),
      displayName(fields.buyingManager),
      displayName(fields.salesRepresentative),
      fields.secondaryAccountManagers.split(", ").map(displayName).join(", "),
      logisticsDisplay,
      fields.department,
      fields.vendor,
      fields.placeOfLoading,
      fields.portRamp,
      fields.productGrade,
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

    await appendToSheet(auth, row);
    await sendEmail(fields, fileLinks);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Order submission error:", err);
    return NextResponse.json({ error: "Failed to submit order" }, { status: 500 });
  }
}
