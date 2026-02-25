import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

const PDF_OUT_DIR = path.resolve(process.cwd(), "server", "generated_pdfs");
const PAGE_MARGIN = 40;

const COLORS = {
  header: "#0F766E",
  label: "#6B7280",
  value: "#111827",
  border: "#E5E7EB",
  softBg: "#F9FAFB",
  paid: "#047857",
  balance: "#C2410C",
} as const;

type PdfDoc = InstanceType<typeof PDFDocument>;

export interface ReceiptData {
  ackNo: string;
  date: string;
  patientName: string;
  facilityName: string;
  facilityPhone?: string;
  facilityAddress?: string;
  caseTitle?: string;
  amountFinal: number;
  amountPaid: number;
  balance: number;
  splitLabel?: string;
  doctorAmount?: number;
  visitingDoctorAmount?: number;
  notes?: string;
  generatedAt?: string;
}

function sanitizeFileKey(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "_");
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "-";
  const str = String(value).trim();
  return str.length > 0 ? str : "-";
}

function optionalText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  return str.length > 0 ? str : undefined;
}

function formatMoney(value: unknown): string {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "-";
  return `INR ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function drawKeyValueRow(
  doc: PdfDoc,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  options?: { valueColor?: string; bold?: boolean },
): number {
  doc.fillColor(COLORS.label).font("Helvetica").fontSize(10).text(label, x, y, {
    width: Math.floor(width * 0.55),
    align: "left",
  });

  doc
    .fillColor(options?.valueColor ?? COLORS.value)
    .font(options?.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(11)
    .text(value, x, y, {
      width,
      align: "right",
    });

  return y + 18;
}

function drawSectionCard(doc: PdfDoc, x: number, y: number, width: number, height: number, fillColor = "#FFFFFF"): void {
  doc.save();
  doc.fillColor(fillColor).strokeColor(COLORS.border).lineWidth(1);
  doc.roundedRect(x, y, width, height, 8).fillAndStroke();
  doc.restore();
}

function renderLegacyLines(doc: PdfDoc, ackNo: string, lines: string[]): void {
  const pageWidth = doc.page.width;
  const left = PAGE_MARGIN;
  const right = pageWidth - PAGE_MARGIN;
  const contentWidth = right - left;

  doc.save();
  doc.fillColor(COLORS.header);
  doc.roundedRect(left, PAGE_MARGIN, contentWidth, 44, 6).fill();
  doc.restore();

  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(14).text("ACKNOWLEDGMENT RECEIPT", left + 12, PAGE_MARGIN + 14);

  let y = PAGE_MARGIN + 58;
  doc.fillColor(COLORS.label).font("Helvetica").fontSize(10).text(`Ack No: ${toText(ackNo)}`, left, y, { width: contentWidth });
  y += 16;

  doc.save();
  doc.strokeColor(COLORS.border).lineWidth(1).moveTo(left, y).lineTo(right, y).stroke();
  doc.restore();
  y += 12;

  doc.fillColor(COLORS.value).font("Helvetica").fontSize(11);
  for (const rawLine of lines) {
    const line = String(rawLine ?? "");
    if (line.trim().length === 0) {
      y += 8;
      continue;
    }

    if (y > doc.page.height - PAGE_MARGIN - 40) {
      doc.addPage();
      y = PAGE_MARGIN;
    }

    doc.text(line, left, y, { width: contentWidth, lineGap: 1 });
    y = doc.y + 4;
  }
}

function renderModernReceipt(doc: PdfDoc, fallbackAckNo: string, payload: ReceiptData): void {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const left = PAGE_MARGIN;
  const right = pageWidth - PAGE_MARGIN;
  const contentWidth = right - left;
  const displayAckNo = toText(payload.ackNo || fallbackAckNo);

  const facilityName = toText(payload.facilityName);
  const facilityAddress = optionalText(payload.facilityAddress);
  const facilityPhone = optionalText(payload.facilityPhone);
  const addressPhoneLine = [facilityAddress, facilityPhone ? `Phone: ${facilityPhone}` : undefined]
    .filter(Boolean)
    .join("  |  ");

  const headerHeight = 86;
  doc.save();
  doc.fillColor(COLORS.header);
  doc.roundedRect(left, PAGE_MARGIN, contentWidth, headerHeight, 8).fill();
  doc.restore();

  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(18).text(facilityName, left + 16, PAGE_MARGIN + 16, {
    width: contentWidth - 32,
    align: "left",
  });

  if (addressPhoneLine) {
    doc.fillColor("#FFFFFF").font("Helvetica").fontSize(10).text(addressPhoneLine, left + 16, PAGE_MARGIN + 50, {
      width: contentWidth - 32,
      align: "left",
    });
  }

  let y = PAGE_MARGIN + headerHeight + 18;

  doc.fillColor(COLORS.value).font("Helvetica-Bold").fontSize(16).text("ACKNOWLEDGMENT RECEIPT", left, y, {
    width: contentWidth,
    align: "left",
  });
  y += 26;

  doc.save();
  doc.strokeColor(COLORS.border).lineWidth(1).moveTo(left, y).lineTo(right, y).stroke();
  doc.restore();
  y += 14;

  const metaWidth = 240;
  let metaY = y;
  metaY = drawKeyValueRow(doc, right - metaWidth, metaY, metaWidth, "Ack No", displayAckNo);
  metaY = drawKeyValueRow(doc, right - metaWidth, metaY, metaWidth, "Date", toText(payload.date));
  if (optionalText(payload.generatedAt)) {
    metaY = drawKeyValueRow(doc, right - metaWidth, metaY, metaWidth, "Generated At", toText(payload.generatedAt));
  }

  y = Math.max(y, metaY) + 8;

  doc.fillColor(COLORS.label).font("Helvetica-Bold").fontSize(11).text("PATIENT DETAILS", left, y);
  y += 18;

  const patientRows = [toText(payload.patientName), optionalText(payload.caseTitle) ? toText(payload.caseTitle) : null].filter(
    Boolean,
  ).length;
  const patientBoxHeight = patientRows === 2 ? 58 : 40;

  drawSectionCard(doc, left, y, contentWidth, patientBoxHeight);
  let rowY = y + 11;
  rowY = drawKeyValueRow(doc, left + 12, rowY, contentWidth - 24, "Patient Name", toText(payload.patientName));
  if (optionalText(payload.caseTitle)) {
    rowY = drawKeyValueRow(doc, left + 12, rowY, contentWidth - 24, "Case Title", toText(payload.caseTitle));
  }
  y += patientBoxHeight + 18;

  doc.fillColor(COLORS.label).font("Helvetica-Bold").fontSize(11).text("PAYMENT SUMMARY", left, y);
  y += 18;

  const paymentBoxHeight = 80;
  drawSectionCard(doc, left, y, contentWidth, paymentBoxHeight, COLORS.softBg);
  rowY = y + 12;
  rowY = drawKeyValueRow(doc, left + 12, rowY, contentWidth - 24, "Amount Final", formatMoney(payload.amountFinal));
  rowY = drawKeyValueRow(doc, left + 12, rowY, contentWidth - 24, "Amount Paid", formatMoney(payload.amountPaid), {
    valueColor: COLORS.paid,
  });
  rowY = drawKeyValueRow(doc, left + 12, rowY, contentWidth - 24, "Balance", formatMoney(payload.balance), {
    valueColor: COLORS.balance,
    bold: true,
  });
  y += paymentBoxHeight + 18;

  doc.fillColor(COLORS.label).font("Helvetica-Bold").fontSize(11).text("REVENUE SPLIT", left, y);
  y += 18;

  const splitBoxHeight = 78;
  drawSectionCard(doc, left, y, contentWidth, splitBoxHeight);
  rowY = y + 10;
  rowY = drawKeyValueRow(doc, left + 12, rowY, contentWidth - 24, "Split Agreed", toText(payload.splitLabel));
  rowY = drawKeyValueRow(doc, left + 12, rowY, contentWidth - 24, "Doctor Amount", formatMoney(payload.doctorAmount));
  rowY = drawKeyValueRow(
    doc,
    left + 12,
    rowY,
    contentWidth - 24,
    "Visiting Doctor Amount",
    formatMoney(payload.visitingDoctorAmount),
  );
  y += splitBoxHeight + 18;

  const notes = optionalText(payload.notes);
  if (notes && notes !== "-") {
    doc.fillColor(COLORS.label).font("Helvetica-Bold").fontSize(11).text("NOTES", left, y);
    y += 18;

    const notesWidth = contentWidth - 24;
    const notesHeight = Math.max(54, doc.heightOfString(notes, { width: notesWidth }) + 20);
    drawSectionCard(doc, left, y, contentWidth, notesHeight);
    doc.fillColor(COLORS.value).font("Helvetica").fontSize(11).text(notes, left + 12, y + 10, {
      width: notesWidth,
      align: "left",
    });
    y += notesHeight + 18;
  }

  const footerY = Math.max(y, pageHeight - PAGE_MARGIN - 60);
  doc.save();
  doc.strokeColor(COLORS.border).lineWidth(1).moveTo(left, footerY).lineTo(right, footerY).stroke();
  doc.restore();

  doc.fillColor(COLORS.label).font("Helvetica").fontSize(9).text("This is a computer-generated receipt.", left, footerY + 10, {
    width: contentWidth,
    align: "left",
  });
  doc.fillColor(COLORS.value).font("Helvetica").fontSize(10).text("Authorized Signature: ____________________", left, footerY + 28, {
    width: contentWidth,
    align: "right",
  });
}

function isStructuredPayload(input: string[] | ReceiptData): input is ReceiptData {
  return !Array.isArray(input);
}

async function renderPdfToFile(fullPath: string, ackNo: string, payload: string[] | ReceiptData): Promise<void> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN },
    info: {
      Title: "Acknowledgment Receipt",
      Author: "Secure Health Hub",
      Subject: `Acknowledgment ${ackNo}`,
      Creator: "Secure Health Hub",
      Producer: "PDFKit",
    },
  });

  const stream = createWriteStream(fullPath);
  const done = new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
    doc.on("error", reject);
  });

  doc.pipe(stream);
  if (isStructuredPayload(payload)) {
    renderModernReceipt(doc, ackNo, payload);
  } else {
    renderLegacyLines(doc, ackNo, payload);
  }
  doc.end();
  await done;
}

export function writeAcknowledgmentPdf(ackNo: string, lines: string[]): Promise<string>;
export function writeAcknowledgmentPdf(ackNo: string, receiptData: ReceiptData): Promise<string>;
export async function writeAcknowledgmentPdf(
  ackNo: string,
  payload: string[] | ReceiptData,
): Promise<string> {
  await fs.mkdir(PDF_OUT_DIR, { recursive: true });
  const safeAckNo = sanitizeFileKey(ackNo);
  const filename = `${safeAckNo}-${Date.now()}.pdf`;
  const fullPath = path.join(PDF_OUT_DIR, filename);

  await renderPdfToFile(fullPath, ackNo, payload);
  return fullPath;
}
