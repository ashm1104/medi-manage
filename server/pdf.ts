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
  adminName?: string;
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
  paymentSummaryRows?: Array<{
    date: string;
    amountFinal?: number;
    amountPaid: number;
    balance: number;
  }>;
  paymentHistory?: Array<{
    ackNo: string;
    date: string;
    facilityName: string;
    ackType: string;
    amountFinal: number;
    amountPaid: number;
    balance: number;
  }>;
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

function formatDisplayDate(value: unknown): string {
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return toText(value);
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

function ensurePageSpace(doc: PdfDoc, y: number, minHeight: number): number {
  const availableBottom = doc.page.height - PAGE_MARGIN;
  if (y + minHeight <= availableBottom) return y;
  doc.addPage();
  return PAGE_MARGIN;
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
  const receiptDate = formatDisplayDate(payload.date);
  const generatedDate = optionalText(payload.generatedAt) ? formatDisplayDate(payload.generatedAt) : undefined;
  const adminName = toText(payload.adminName ?? "Admin");

  const facilityName = toText(payload.facilityName);
  const patientName = toText(payload.patientName);
  const facilityAddress = optionalText(payload.facilityAddress);
  const facilityPhone = optionalText(payload.facilityPhone);
  const facilityMetaLine = [facilityAddress, facilityPhone ? `Phone: ${facilityPhone}` : undefined]
    .filter(Boolean)
    .join("  |  ");

  const headerHeight = 90;
  doc.save();
  doc.fillColor(COLORS.header);
  doc.roundedRect(left, PAGE_MARGIN, contentWidth, headerHeight, 8).fill();
  doc.restore();

  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(18).text(adminName, left + 16, PAGE_MARGIN + 16, {
    width: contentWidth - 32,
    align: "left",
  });
  doc.fillColor("#D1FAF5").font("Helvetica").fontSize(10).text("Administrator", left + 16, PAGE_MARGIN + 44, {
    width: contentWidth - 32,
    align: "left",
  });

  const ackMetaX = right - 215;
  doc.fillColor("#CCFBF1").font("Helvetica").fontSize(8).text("ACK NO", ackMetaX, PAGE_MARGIN + 14, {
    width: 200,
    align: "right",
  });
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10).text(displayAckNo, ackMetaX, PAGE_MARGIN + 24, {
    width: 200,
    align: "right",
    lineGap: 1,
  });
  doc.fillColor("#CCFBF1").font("Helvetica").fontSize(8).text("RECEIPT DATE", ackMetaX, PAGE_MARGIN + 58, {
    width: 200,
    align: "right",
  });
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10).text(receiptDate, ackMetaX, PAGE_MARGIN + 68, {
    width: 200,
    align: "right",
  });

  let y = PAGE_MARGIN + headerHeight + 16;

  doc.fillColor(COLORS.value).font("Helvetica-Bold").fontSize(15).text("ACKNOWLEDGMENT RECEIPT", left, y, {
    width: contentWidth,
    align: "left",
  });
  y += 22;

  doc.save();
  doc.strokeColor(COLORS.border).lineWidth(1).moveTo(left, y).lineTo(right, y).stroke();
  doc.restore();
  y += 12;

  if (generatedDate) {
    doc.fillColor(COLORS.label).font("Helvetica").fontSize(9).text(`Generated: ${generatedDate}`, left, y, {
      width: contentWidth,
      align: "right",
    });
    y += 14;
  }

  doc.fillColor(COLORS.label).font("Helvetica-Bold").fontSize(11).text("DETAILS", left, y);
  y += 18;

  const detailRows: Array<{ label: string; value: string }> = [
    { label: "Patient", value: patientName },
    { label: "Facility", value: facilityName },
  ];
  if (optionalText(payload.caseTitle)) {
    detailRows.push({ label: "Treatment", value: toText(payload.caseTitle) });
  }
  if (facilityMetaLine) {
    detailRows.push({ label: "Facility Info", value: facilityMetaLine });
  }

  const detailsHeight = 12 + detailRows.length * 18 + 8;
  y = ensurePageSpace(doc, y, detailsHeight + 10);
  drawSectionCard(doc, left, y, contentWidth, detailsHeight);
  let detailY = y + 10;
  detailRows.forEach((row) => {
    detailY = drawKeyValueRow(doc, left + 12, detailY, contentWidth - 24, row.label, row.value);
  });
  y += detailsHeight + 18;

  doc.fillColor(COLORS.label).font("Helvetica-Bold").fontSize(11).text("PAYMENT SUMMARY", left, y);
  y += 18;

  const summaryRows = Array.isArray(payload.paymentSummaryRows) && payload.paymentSummaryRows.length > 0
    ? payload.paymentSummaryRows
    : Array.isArray(payload.paymentHistory) && payload.paymentHistory.length > 0
      ? payload.paymentHistory.map((entry) => ({
          date: entry.date,
          amountFinal: entry.amountFinal,
          amountPaid: entry.amountPaid,
          balance: entry.balance,
        }))
      : [{
          date: payload.date,
          amountFinal: payload.amountFinal,
          amountPaid: payload.amountPaid,
          balance: payload.balance,
        }];
  const hasFinalInRows = summaryRows.some((row) => Number.isFinite(Number(row.amountFinal)));
  const showFinalOnce = !hasFinalInRows && Number.isFinite(Number(payload.amountFinal));

  const columns = hasFinalInRows
    ? [
        { key: "date", label: "Date", width: 0.26, align: "left" as const },
        { key: "amountFinal", label: "Final Amount", width: 0.25, align: "right" as const },
        { key: "amountPaid", label: "Amount Paid", width: 0.24, align: "right" as const },
        { key: "balance", label: "Balance", width: 0.25, align: "right" as const },
      ]
    : [
        { key: "date", label: "Date", width: 0.34, align: "left" as const },
        { key: "amountPaid", label: "Amount Paid", width: 0.33, align: "right" as const },
        { key: "balance", label: "Balance", width: 0.33, align: "right" as const },
      ];

  const cardPadding = 8;
  const tableHeaderHeight = 22;
  const rowHeight = 20;
  let cursor = 0;
  let needsFinalCaption = showFinalOnce;
  while (cursor < summaryRows.length) {
    const extraTop = needsFinalCaption ? 22 : 0;
    y = ensurePageSpace(doc, y, tableHeaderHeight + rowHeight + cardPadding * 2 + extraTop + 8);
    const availableHeight = doc.page.height - PAGE_MARGIN - y;
    const maxRowsPerPage = Math.max(
      1,
      Math.floor((availableHeight - (cardPadding * 2 + tableHeaderHeight + extraTop + 8)) / rowHeight),
    );
    const chunk = summaryRows.slice(cursor, cursor + maxRowsPerPage);
    const cardHeight = cardPadding * 2 + tableHeaderHeight + rowHeight * chunk.length + extraTop;

    drawSectionCard(doc, left, y, contentWidth, cardHeight, COLORS.softBg);
    const innerX = left + cardPadding;
    const innerY = y + cardPadding;
    const innerWidth = contentWidth - cardPadding * 2;

    let tableY = innerY;
    if (needsFinalCaption) {
      drawKeyValueRow(doc, innerX + 4, innerY + 2, innerWidth - 8, "Final Amount", formatMoney(payload.amountFinal), {
        bold: true,
      });
      tableY += extraTop;
    }

    doc.save();
    doc.fillColor("#FFFFFF").rect(innerX, tableY, innerWidth, tableHeaderHeight).fill();
    doc.restore();

    const colWidths = columns.map((col) => Math.floor(innerWidth * col.width));
    const widthDelta = innerWidth - colWidths.reduce((sum, width) => sum + width, 0);
    if (colWidths.length > 0) colWidths[colWidths.length - 1] += widthDelta;

    let colX = innerX;
    columns.forEach((col, index) => {
      const width = colWidths[index];
      doc.fillColor(COLORS.label).font("Helvetica-Bold").fontSize(9).text(col.label, colX + 6, tableY + 6, {
        width: Math.max(10, width - 12),
        align: col.align,
      });
      colX += width;
    });

    chunk.forEach((entry, rowIndex) => {
      const rowTop = tableY + tableHeaderHeight + rowIndex * rowHeight;
      if (rowIndex % 2 === 0) {
        doc.save();
        doc.fillColor("#F8FAFC").rect(innerX, rowTop, innerWidth, rowHeight).fill();
        doc.restore();
      }

      const values: Record<string, string> = {
        date: formatDisplayDate(entry.date),
        amountFinal: formatMoney(entry.amountFinal),
        amountPaid: formatMoney(entry.amountPaid),
        balance: formatMoney(entry.balance),
      };

      let valueX = innerX;
      columns.forEach((col, index) => {
        const width = colWidths[index];
        doc
          .fillColor(col.key === "balance" ? COLORS.balance : col.key === "amountPaid" ? COLORS.paid : COLORS.value)
          .font("Helvetica")
          .fontSize(9)
          .text(values[col.key], valueX + 6, rowTop + 5, {
            width: Math.max(10, width - 12),
            align: col.align,
          });
        valueX += width;
      });
    });

    cursor += chunk.length;
    needsFinalCaption = false;
    y += cardHeight + 14;
  }

  doc.fillColor(COLORS.label).font("Helvetica-Bold").fontSize(11).text("REVENUE SPLIT", left, y);
  y += 18;

  const splitBoxHeight = 74;
  drawSectionCard(doc, left, y, contentWidth, splitBoxHeight);
  let rowY = y + 9;
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
    y = ensurePageSpace(doc, y, 80);
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

  const footerY = Math.max(y, pageHeight - PAGE_MARGIN - 54);
  doc.save();
  doc.strokeColor(COLORS.border).lineWidth(1).moveTo(left, footerY).lineTo(right, footerY).stroke();
  doc.restore();

  doc.fillColor(COLORS.label).font("Helvetica").fontSize(9).text("This is a computer-generated receipt.", left, footerY + 10, {
    width: contentWidth,
    align: "left",
  });
  doc.fillColor(COLORS.value).font("Helvetica").fontSize(10).text("Authorized Signature: ____________________", left, footerY + 26, {
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
