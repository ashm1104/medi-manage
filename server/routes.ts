import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { computeSplitAmounts, toNumber } from "./ack-utils";
import { writeAcknowledgmentPdf } from "./pdf";
import { db } from "./db";
import { ack_docs, cases, facilities, patients } from "@shared/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  getTreatmentSubTypes,
  normalizeTreatmentSubType,
  normalizeTreatmentType,
  TREATMENT_TYPE_SUBTYPE_MAP,
} from "@shared/treatments";
import path from "node:path";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const CASE_STATUSES = ["OPEN", "HOLD", "CLOSED"] as const;
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const isUuid = (value: string) => UUID_REGEX.test(value);

  const getBearerToken = (req: any): string | null => {
    const auth = req.headers.authorization;
    if (!auth || typeof auth !== "string") return null;
    if (!auth.toLowerCase().startsWith("bearer ")) return null;
    return auth.slice(7).trim();
  };

  const toNonEmptyText = (value: unknown): string | null => {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim().replace(/\s+/g, " ");
    return normalized.length > 0 ? normalized : null;
  };

  const decodeJwtPayload = (token: string): Record<string, any> | null => {
    try {
      const parts = token.split(".");
      if (parts.length < 2) return null;
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      return payload && typeof payload === "object" ? payload : null;
    } catch {
      return null;
    }
  };

  const getUserIdFromJwt = (token: string): string | null => {
    const payload = decodeJwtPayload(token);
    const sub = payload?.sub;
    return typeof sub === "string" && isUuid(sub) ? sub : null;
  };

  const getUserDisplayName = (req: any): string => {
    const headerName = toNonEmptyText(req.headers["x-user-name"]);
    const token = getBearerToken(req);
    const payload = token ? decodeJwtPayload(token) : null;
    const meta = payload?.user_metadata ?? {};
    const jwtName =
      toNonEmptyText(meta.full_name)
      ?? toNonEmptyText(meta.name)
      ?? toNonEmptyText(payload?.name)
      ?? toNonEmptyText(payload?.email);
    return jwtName ?? headerName ?? "Admin";
  };

  const getUserId = (req: any) => {
    const token = getBearerToken(req);
    const jwtUserId = token ? getUserIdFromJwt(token) : null;
    if (jwtUserId) return jwtUserId;

    const headerUserId = req.headers["x-user-id"];
    if (!headerUserId || typeof headerUserId !== "string" || !isUuid(headerUserId)) {
      const err: any = new Error("Unauthorized");
      err.status = 401;
      throw err;
    }
    return headerUserId;
  };

  const normalizeCaseStatus = (value: unknown): (typeof CASE_STATUSES)[number] | undefined => {
    if (typeof value !== "string") return undefined;
    const normalized = value.trim().toUpperCase();
    return CASE_STATUSES.includes(normalized as (typeof CASE_STATUSES)[number])
      ? (normalized as (typeof CASE_STATUSES)[number])
      : undefined;
  };

  const normalizeNullableText = (value: unknown): string | null => toNonEmptyText(value);

  const validateTreatmentTypePair = (
    typeValue: unknown,
    subTypeValue: unknown,
  ): { treatmentType: string | null; treatmentSubType: string | null; error?: string } => {
    const hasTypeInput = typeValue !== undefined && typeValue !== null && String(typeValue).trim() !== "";
    const hasSubTypeInput = subTypeValue !== undefined && subTypeValue !== null && String(subTypeValue).trim() !== "";

    if (!hasTypeInput && !hasSubTypeInput) {
      return { treatmentType: null, treatmentSubType: null };
    }

    if (!hasTypeInput && hasSubTypeInput) {
      return {
        treatmentType: null,
        treatmentSubType: null,
        error: "treatment_sub_type requires treatment_type",
      };
    }

    const treatmentType = normalizeTreatmentType(typeValue);
    if (!treatmentType) {
      return {
        treatmentType: null,
        treatmentSubType: null,
        error: `Invalid treatment_type. Allowed: ${Object.keys(TREATMENT_TYPE_SUBTYPE_MAP).join(", ")}`,
      };
    }

    if (!hasSubTypeInput) {
      return { treatmentType, treatmentSubType: null };
    }

    const treatmentSubType = normalizeTreatmentSubType(treatmentType, subTypeValue);
    if (!treatmentSubType) {
      const allowed = getTreatmentSubTypes(treatmentType).join(", ");
      return {
        treatmentType,
        treatmentSubType: null,
        error: `Invalid treatment_sub_type for ${treatmentType}. Allowed: ${allowed}`,
      };
    }

    return { treatmentType, treatmentSubType };
  };

  const ensureNoOpenTreatmentConflict = async (
    patientId: string,
    userId: string,
    targetStatus: (typeof CASE_STATUSES)[number],
    excludeCaseId?: string,
  ) => {
    if (targetStatus !== "OPEN") return null;
    const openTreatment = await storage.getOpenCaseForPatient(patientId, userId, excludeCaseId);
    if (openTreatment) {
      return "Only one OPEN treatment is allowed per patient";
    }
    return null;
  };

  const toTreatmentView = (caseRow: typeof cases.$inferSelect) => ({
    id: caseRow.id,
    patient_id: caseRow.patient_id,
    primary_facility_id: caseRow.primary_facility_id,
    treatment_title: caseRow.case_title,
    treatment_type: caseRow.treatment_type,
    treatment_sub_type: caseRow.treatment_sub_type,
    treatment_status: normalizeCaseStatus(caseRow.status) ?? "OPEN",
    treatment_start_date: caseRow.start_date,
    treatment_notes: caseRow.notes,
    treatment_closure_date: caseRow.closure_date,
    treatment_closure_notes: caseRow.closure_notes,
    owner_user_id: caseRow.owner_user_id,
    created_at: caseRow.created_at,
  });

  const formatAckDate = (value: unknown): string => {
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? "-" : date.toISOString().slice(0, 10);
  };

  const getAckReceiptRecord = async (id: string, userId: string) => {
    const [record] = await db.select({
      ack: ack_docs,
      patient_name: patients.name_or_code,
      facility_name: facilities.facility_name,
      facility_address: facilities.address,
      facility_phone: facilities.phone,
      case_title: cases.case_title,
    })
    .from(ack_docs)
    .leftJoin(patients, eq(ack_docs.patient_id, patients.id))
    .leftJoin(facilities, eq(ack_docs.facility_id, facilities.id))
    .leftJoin(
      cases,
      and(
        sql`${cases.id}::text = ${ack_docs.case_ref}`,
        eq(cases.owner_user_id, userId as string),
      ),
    )
    .where(and(eq(ack_docs.id, id), eq(ack_docs.owner_user_id, userId as string)));
    return record;
  };

  const generateSingleReceiptPdf = async (
    id: string,
    userId: string,
    record: any,
    adminName: string,
  ): Promise<string> => {
    const amountFinal = toNumber(record.ack.amount_final);
    const amountPaid = toNumber(record.ack.amount_paid);
    const balance = Number.isFinite(toNumber(record.ack.balance)) ? toNumber(record.ack.balance) : 0;
    const split = computeSplitAmounts(amountPaid, record.ack.split_agreed);
    const splitLabel = split.parsed ? `${split.parsed.hostPct}/${split.parsed.visitPct}` : "NA";
    const nowIso = new Date().toISOString();

    const fullPath = await writeAcknowledgmentPdf(record.ack.ack_no, {
      adminName,
      ackNo: record.ack.ack_no,
      date: String(record.ack.ack_date ?? "-"),
      patientName: String(record.patient_name ?? "-"),
      facilityName: String(record.facility_name ?? "-"),
      facilityAddress: record.facility_address ?? undefined,
      facilityPhone: record.facility_phone ?? undefined,
      caseTitle: record.case_title ?? undefined,
      amountFinal,
      amountPaid,
      balance,
      splitLabel,
      doctorAmount: split.hostAmount ?? undefined,
      visitingDoctorAmount: split.visitingAmount ?? undefined,
      notes: record.ack.notes ?? undefined,
      generatedAt: nowIso,
    });
    const relativePath = `/${path.relative(process.cwd(), fullPath).replaceAll("\\", "/")}`;

    await storage.updateAcknowledgment(id, userId as string, {
      pdf_path: relativePath,
      visiting_doc_share: split.visitingAmountText,
    });

    return fullPath;
  };

  const buildHistoryReceiptPayload = (
    baseRecord: any,
    history: any[],
    title: string,
    adminName: string,
  ) => {
    const latest = history[history.length - 1] ?? baseRecord.ack;
    const totalFinal = history.reduce((acc, row) => acc + (Number.isFinite(toNumber(row.amount_final)) ? toNumber(row.amount_final) : 0), 0);
    const totalPaid = history.reduce((acc, row) => acc + (Number.isFinite(toNumber(row.amount_paid)) ? toNumber(row.amount_paid) : 0), 0);
    const currentBalance = Number.isFinite(toNumber(latest?.balance)) ? toNumber(latest.balance) : 0;
    const latestFinal = Number.isFinite(toNumber(latest?.amount_final)) ? toNumber(latest.amount_final) : totalFinal;
    const splitValues = Array.from(
      new Set(
        history
          .map((entry: any) => String(entry.split_agreed ?? "").trim())
          .filter((value) => value.length > 0),
      ),
    );
    const splitLabel = splitValues.length === 0 ? "-" : splitValues.length === 1 ? splitValues[0] : splitValues.join(", ");

    const splitTotals = history.reduce(
      (acc: { doctor: number; visiting: number }, entry: any) => {
        const amountPaid = Number.isFinite(toNumber(entry.amount_paid)) ? toNumber(entry.amount_paid) : 0;
        const split = computeSplitAmounts(amountPaid, entry.split_agreed);
        return {
          doctor: acc.doctor + (split.hostAmount ?? 0),
          visiting: acc.visiting + (split.visitingAmount ?? 0),
        };
      },
      { doctor: 0, visiting: 0 },
    );

    return {
      adminName,
      ackNo: String(baseRecord.ack.ack_no ?? `HISTORY-${Date.now()}`),
      date: formatAckDate(baseRecord.ack.ack_date),
      patientName: String(baseRecord.patient_name ?? "-"),
      facilityName: String(baseRecord.facility_name ?? "-"),
      facilityAddress: baseRecord.facility_address ?? undefined,
      facilityPhone: baseRecord.facility_phone ?? undefined,
      caseTitle: baseRecord.case_title ?? undefined,
      amountFinal: latestFinal,
      amountPaid: totalPaid,
      balance: currentBalance,
      splitLabel,
      doctorAmount: splitTotals.doctor,
      visitingDoctorAmount: splitTotals.visiting,
      notes: title,
      generatedAt: new Date().toISOString(),
      paymentSummaryRows: history.map((entry: any) => ({
        date: formatAckDate(entry.ack_date),
        amountPaid: Number.isFinite(toNumber(entry.amount_paid)) ? toNumber(entry.amount_paid) : 0,
        balance: Number.isFinite(toNumber(entry.balance)) ? toNumber(entry.balance) : 0,
      })),
    };
  };

  const generateHistoryReceiptPdf = async (
    record: any,
    userId: string,
    adminName: string,
  ): Promise<string> => {
    const patientId = record?.ack?.patient_id;
    const facilityId = record?.ack?.facility_id;
    if (!patientId || !facilityId) {
      throw new Error("patient_id and facility_id are required for history PDF generation");
    }

    const history = await db.select()
      .from(ack_docs)
      .where(and(
        eq(ack_docs.owner_user_id, userId as string),
        eq(ack_docs.patient_id, patientId),
        eq(ack_docs.facility_id, facilityId),
      ))
      .orderBy(sql`${ack_docs.ack_date} ASC NULLS LAST`, sql`${ack_docs.created_at} ASC`);

    const payload = buildHistoryReceiptPayload(
      record,
      history,
      "Payment history for this patient-facility pair.",
      adminName,
    );
    const historyKey = `HISTORY-${record.ack.ack_no}`;
    return writeAcknowledgmentPdf(historyKey, payload);
  };

  const resolveTreatmentTitleFromRows = async (rows: any[], userId: string): Promise<string | undefined> => {
    const caseRefs = Array.from(
      new Set(
        rows
          .map((row: any) => String((row?.ack ?? row)?.case_ref ?? "").trim())
          .filter((ref) => isUuid(ref)),
      ),
    );
    if (caseRefs.length === 0) return undefined;

    const treatmentRows = await db.select({
      id: cases.id,
      title: cases.case_title,
    })
      .from(cases)
      .where(and(eq(cases.owner_user_id, userId), inArray(cases.id, caseRefs)));

    const titles = Array.from(
      new Set(
        treatmentRows
          .map((row: any) => toNonEmptyText(row.title))
          .filter((title): title is string => Boolean(title)),
      ),
    );

    if (titles.length === 0) return undefined;
    if (titles.length === 1) return titles[0];
    return `Multiple Treatments (${titles.length})`;
  };

  const buildPatientHistoryReceiptPayload = (
    patient: any,
    rows: any[],
    adminName: string,
    caseTitle?: string,
  ) => {
    const normalizedRows = [...rows];
    const chronologicalRows = [...normalizedRows].reverse();
    const latestAck = normalizedRows[0]?.ack;
    const facilityNames = Array.from(
      new Set(
        normalizedRows
          .map((row: any) => String(row.facility_name ?? "").trim())
          .filter((name) => name.length > 0),
      ),
    );

    const totalFinal = normalizedRows.reduce(
      (acc: number, row: any) =>
        acc + (Number.isFinite(toNumber(row?.ack?.amount_final)) ? toNumber(row.ack.amount_final) : 0),
      0,
    );
    const totalPaid = normalizedRows.reduce(
      (acc: number, row: any) =>
        acc + (Number.isFinite(toNumber(row?.ack?.amount_paid)) ? toNumber(row.ack.amount_paid) : 0),
      0,
    );
    const latestFinal = Number.isFinite(toNumber(latestAck?.amount_final))
      ? toNumber(latestAck.amount_final)
      : totalFinal;
    const currentBalance = Number.isFinite(toNumber(latestAck?.balance))
      ? toNumber(latestAck.balance)
      : 0;
    const splitValues = Array.from(
      new Set(
        normalizedRows
          .map((row: any) => String(row?.ack?.split_agreed ?? "").trim())
          .filter((value) => value.length > 0),
      ),
    );
    const splitLabel = splitValues.length === 0 ? "-" : splitValues.length === 1 ? splitValues[0] : splitValues.join(", ");
    const splitTotals = normalizedRows.reduce(
      (acc: { doctor: number; visiting: number }, row: any) => {
        const ack = row.ack ?? row;
        const amountPaid = Number.isFinite(toNumber(ack.amount_paid)) ? toNumber(ack.amount_paid) : 0;
        const split = computeSplitAmounts(amountPaid, ack.split_agreed);
        return {
          doctor: acc.doctor + (split.hostAmount ?? 0),
          visiting: acc.visiting + (split.visitingAmount ?? 0),
        };
      },
      { doctor: 0, visiting: 0 },
    );

    return {
      adminName,
      ackNo: `HISTORY-${String(patient.id)}`,
      date: latestAck ? formatAckDate(latestAck.ack_date) : formatAckDate(new Date().toISOString()),
      patientName: String(patient.name_or_code ?? "-"),
      facilityName: facilityNames.length === 0
        ? "-"
        : facilityNames.length === 1
          ? facilityNames[0]
          : `Multiple Facilities (${facilityNames.length})`,
      caseTitle,
      amountFinal: latestFinal,
      amountPaid: totalPaid,
      balance: currentBalance,
      splitLabel,
      doctorAmount: splitTotals.doctor,
      visitingDoctorAmount: splitTotals.visiting,
      notes: "Complete payment history for this patient.",
      generatedAt: new Date().toISOString(),
      paymentSummaryRows: chronologicalRows.map((row: any) => {
        const ack = row.ack ?? row;
        return {
          date: formatAckDate(ack.ack_date),
          amountPaid: Number.isFinite(toNumber(ack.amount_paid)) ? toNumber(ack.amount_paid) : 0,
          balance: Number.isFinite(toNumber(ack.balance)) ? toNumber(ack.balance) : 0,
        };
      }),
    };
  };

  // Facilities
  app.get(api.facilities.list.path, async (req, res) => {
    const userId = getUserId(req);
    const data = await storage.getFacilities(userId as string);
    res.json(data);
  });

  app.get(api.facilities.get.path, async (req, res) => {
    const userId = getUserId(req);
    const data = await storage.getFacility(req.params.id, userId as string);
    if (!data) return res.status(404).json({ message: "Facility not found" });
    res.json(data);
  });

  app.post(api.facilities.create.path, async (req, res) => {
    const userId = getUserId(req);
    try {
      const input = api.facilities.create.input.parse(req.body);
      const data = await storage.createFacility({ ...input, owner_user_id: userId as string });
      res.status(201).json(data);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
    }
  });

  app.put(api.facilities.update.path, async (req, res) => {
    const userId = getUserId(req);
    try {
      const input = api.facilities.update.input.parse(req.body);
      const data = await storage.updateFacility(req.params.id, userId as string, input);
      if (!data) return res.status(404).json({ message: "Not found" });
      res.json(data);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
    }
  });

  app.delete(api.facilities.delete.path, async (req, res) => {
    const userId = getUserId(req);
    await storage.deleteFacility(req.params.id, userId as string);
    res.status(204).send();
  });

  // Patients
  app.get(api.patients.list.path, async (req, res) => {
    const userId = getUserId(req);
    const data = await storage.getPatients(userId as string);
    res.json(data);
  });

  app.get(api.patients.get.path, async (req, res) => {
    const userId = getUserId(req);
    const data = await storage.getPatient(req.params.id, userId as string);
    if (!data) return res.status(404).json({ message: "Patient not found" });
    res.json(data);
  });

  app.post(api.patients.create.path, async (req, res) => {
    const userId = getUserId(req);
    try {
      const input = api.patients.create.input.parse(req.body);
      const data = await storage.createPatient({ ...input, owner_user_id: userId as string });
      res.status(201).json(data);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
    }
  });

  app.put(api.patients.update.path, async (req, res) => {
    const userId = getUserId(req);
    try {
      const input = api.patients.update.input.parse(req.body);
      const data = await storage.updatePatient(req.params.id, userId as string, input);
      if (!data) return res.status(404).json({ message: "Not found" });
      res.json(data);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
    }
  });

  app.delete(api.patients.delete.path, async (req, res) => {
    const userId = getUserId(req);
    await storage.deletePatient(req.params.id, userId as string);
    res.status(204).send();
  });

  app.post(api.patients.linkFacility.path, async (req, res) => {
    const userId = getUserId(req);
    try {
      const input = api.patients.linkFacility.input.parse(req.body);
      const data = await storage.linkPatientToFacility({ 
        ...input, 
        patient_id: req.params.id,
        owner_user_id: userId as string 
      });
      res.status(201).json(data);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
    }
  });

  app.get(api.patients.facilities.path, async (req, res) => {
    const userId = getUserId(req);
    const data = await storage.getPatientFacilities(req.params.patientId, userId as string);
    res.json(data);
  });

  app.get(api.patients.acknowledgmentHistoryPdf.path, async (req, res) => {
    const userId = getUserId(req);
    const adminName = getUserDisplayName(req);
    const patientId = req.params.patientId;
    const patientData = await storage.getPatient(patientId, userId as string);
    if (!patientData?.patient) return res.status(404).json({ message: "Patient not found" });

    const rows = await storage.getPatientAcknowledgments(patientId, userId as string);
    if (!rows.length) {
      return res.status(404).json({ message: "No acknowledgment history found for this patient" });
    }

    const caseTitle = await resolveTreatmentTitleFromRows(rows, userId as string);
    const payload = buildPatientHistoryReceiptPayload(patientData.patient, rows, adminName, caseTitle);
    const fullPath = await writeAcknowledgmentPdf(`HISTORY-${patientData.patient.id}`, payload);
    return res.sendFile(fullPath, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ message: "Failed to generate history PDF" });
      }
    });
  });

  // Patient-scoped Treatments
  app.get(api.patients.treatments.list.path, async (req, res) => {
    const userId = getUserId(req);
    const patientId = req.params.patientId;
    const patient = await storage.getPatient(patientId, userId as string);
    if (!patient?.patient) return res.status(404).json({ message: "Patient not found" });

    const rows = await storage.getPatientTreatments(patientId, userId as string);
    return res.json(rows.map((row: any) => ({
      treatment: toTreatmentView(row.case),
      patient_name: row.patient_name,
      facility_name: row.facility_name,
    })));
  });

  app.get(api.patients.treatments.get.path, async (req, res) => {
    const userId = getUserId(req);
    const { patientId, treatmentId } = req.params;
    const row = await storage.getPatientTreatment(patientId, treatmentId, userId as string);
    if (!row?.case) return res.status(404).json({ message: "Treatment not found" });
    return res.json({
      treatment: toTreatmentView(row.case),
      patient_name: row.patient_name,
      facility_name: row.facility_name,
    });
  });

  app.post(api.patients.treatments.create.path, async (req, res) => {
    const userId = getUserId(req);
    const patientId = req.params.patientId;
    try {
      const input = api.patients.treatments.create.input.parse(req.body);
      const patient = await storage.getPatient(patientId, userId as string);
      if (!patient?.patient) return res.status(404).json({ message: "Patient not found" });

      const title = String(input.treatment_title || "").trim();
      if (!title) return res.status(400).json({ message: "treatment_title is required" });

      const statusFromInput = input.treatment_status !== undefined
        ? normalizeCaseStatus(input.treatment_status)
        : undefined;
      if (input.treatment_status !== undefined && !statusFromInput) {
        return res.status(400).json({ message: "treatment_status must be OPEN, HOLD, or CLOSED" });
      }

      const status = statusFromInput ?? "OPEN";
      const conflictError = await ensureNoOpenTreatmentConflict(patientId, userId as string, status);
      if (conflictError) return res.status(400).json({ message: conflictError });

      const treatmentPair = validateTreatmentTypePair(input.treatment_type, input.treatment_sub_type);
      if (treatmentPair.error) return res.status(400).json({ message: treatmentPair.error });

      const closureDate = normalizeNullableText(input.treatment_closure_date);
      const closureNotes = normalizeNullableText(input.treatment_closure_notes);
      if (status === "CLOSED" && (!closureDate || !closureNotes)) {
        return res.status(400).json({
          message: "Closing a treatment requires both closure date and closing notes",
        });
      }

      const created = await storage.createCase({
        patient_id: patientId,
        primary_facility_id: input.primary_facility_id ?? null,
        case_title: title,
        treatment_type: treatmentPair.treatmentType,
        treatment_sub_type: treatmentPair.treatmentSubType,
        status,
        start_date: String(input.treatment_start_date),
        notes: normalizeNullableText(input.treatment_notes),
        closure_date: status === "CLOSED" ? closureDate : null,
        closure_notes: status === "CLOSED" ? closureNotes : null,
        owner_user_id: userId as string,
      });

      return res.status(201).json({ treatment: toTreatmentView(created) });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  });

  app.put(api.patients.treatments.update.path, async (req, res) => {
    const userId = getUserId(req);
    const { patientId, treatmentId } = req.params;
    try {
      const input = api.patients.treatments.update.input.parse(req.body);
      const existing = await storage.getPatientTreatment(patientId, treatmentId, userId as string);
      if (!existing?.case) return res.status(404).json({ message: "Treatment not found" });

      const statusFromInput = input.treatment_status !== undefined
        ? normalizeCaseStatus(input.treatment_status)
        : undefined;
      if (input.treatment_status !== undefined && !statusFromInput) {
        return res.status(400).json({ message: "treatment_status must be OPEN, HOLD, or CLOSED" });
      }
      const nextStatus = statusFromInput ?? normalizeCaseStatus(existing.case.status) ?? "OPEN";
      const conflictError = await ensureNoOpenTreatmentConflict(
        patientId,
        userId as string,
        nextStatus,
        treatmentId,
      );
      if (conflictError) return res.status(400).json({ message: conflictError });

      const closureDateInput = input.treatment_closure_date === undefined
        ? undefined
        : normalizeNullableText(input.treatment_closure_date);
      const closureNotesInput = input.treatment_closure_notes === undefined
        ? undefined
        : normalizeNullableText(input.treatment_closure_notes);

      const nextClosureDate =
        closureDateInput !== undefined ? closureDateInput : (existing.case.closure_date ?? null);
      const nextClosureNotes =
        closureNotesInput !== undefined ? closureNotesInput : (existing.case.closure_notes ?? null);

      if (nextStatus === "CLOSED" && (!nextClosureDate || !nextClosureNotes)) {
        return res.status(400).json({
          message: "Closing a treatment requires both closure date and closing notes",
        });
      }

      if (input.treatment_title !== undefined && !String(input.treatment_title).trim()) {
        return res.status(400).json({ message: "treatment_title cannot be empty" });
      }

      const shouldValidateTypePair = input.treatment_type !== undefined || input.treatment_sub_type !== undefined;
      let treatmentPair: { treatmentType: string | null; treatmentSubType: string | null } | null = null;
      if (shouldValidateTypePair) {
        let nextTypeRaw: unknown =
          input.treatment_type !== undefined ? input.treatment_type : existing.case.treatment_type;
        let nextSubTypeRaw: unknown =
          input.treatment_sub_type !== undefined ? input.treatment_sub_type : existing.case.treatment_sub_type;
        if (
          input.treatment_type !== undefined &&
          normalizeNullableText(input.treatment_type) === null &&
          input.treatment_sub_type === undefined
        ) {
          nextSubTypeRaw = null;
        }
        const parsedPair = validateTreatmentTypePair(nextTypeRaw, nextSubTypeRaw);
        if (parsedPair.error) return res.status(400).json({ message: parsedPair.error });
        treatmentPair = { treatmentType: parsedPair.treatmentType, treatmentSubType: parsedPair.treatmentSubType };
      }

      const updatePayload: any = {
        status: nextStatus,
      };

      if (input.treatment_title !== undefined) {
        updatePayload.case_title = String(input.treatment_title).trim();
      }
      if (input.treatment_start_date !== undefined) {
        updatePayload.start_date = String(input.treatment_start_date);
      }
      if (input.primary_facility_id !== undefined) {
        updatePayload.primary_facility_id = input.primary_facility_id || null;
      }
      if (input.treatment_notes !== undefined) {
        updatePayload.notes = normalizeNullableText(input.treatment_notes);
      }
      if (shouldValidateTypePair && treatmentPair) {
        updatePayload.treatment_type = treatmentPair.treatmentType;
        updatePayload.treatment_sub_type = treatmentPair.treatmentSubType;
      }

      if (nextStatus !== "CLOSED") {
        updatePayload.closure_date = null;
        updatePayload.closure_notes = null;
      } else {
        updatePayload.closure_date = nextClosureDate;
        updatePayload.closure_notes = nextClosureNotes;
      }

      const updated = await storage.updateCase(treatmentId, userId as string, updatePayload);
      if (!updated) return res.status(404).json({ message: "Treatment not found" });
      return res.json({ treatment: toTreatmentView(updated) });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  });

  // Cases
  app.get(api.cases.list.path, async (req, res) => {
    const userId = getUserId(req);
    const data = await storage.getCases(userId as string);
    res.json(data);
  });

  app.get(api.cases.get.path, async (req, res) => {
    const userId = getUserId(req);
    const data = await storage.getCase(req.params.id, userId as string);
    if (!data) return res.status(404).json({ message: "Case not found" });
    res.json(data);
  });

  app.post(api.cases.create.path, async (req, res) => {
    const userId = getUserId(req);
    try {
      const input = api.cases.create.input.parse(req.body);
      const statusFromInput = input.status !== undefined ? normalizeCaseStatus(input.status) : undefined;
      if (input.status !== undefined && !statusFromInput) {
        return res.status(400).json({ message: "status must be OPEN, HOLD, or CLOSED" });
      }
      const status = statusFromInput ?? "OPEN";
      const conflictError = await ensureNoOpenTreatmentConflict(input.patient_id, userId as string, status);
      if (conflictError) return res.status(400).json({ message: conflictError });

      const treatmentPair = validateTreatmentTypePair(input.treatment_type, input.treatment_sub_type);
      if (treatmentPair.error) return res.status(400).json({ message: treatmentPair.error });

      const closureDate = normalizeNullableText(input.closure_date);
      const closureNotes = normalizeNullableText(input.closure_notes);

      if (status === "CLOSED" && (!closureDate || !closureNotes)) {
        return res.status(400).json({
          message: "Closing a case requires both closure date and closing notes",
        });
      }

      const data = await storage.createCase({
        ...input,
        status,
        notes: input.notes ? String(input.notes).trim() : null,
        treatment_type: treatmentPair.treatmentType,
        treatment_sub_type: treatmentPair.treatmentSubType,
        closure_date: status === "CLOSED" ? closureDate : null,
        closure_notes: status === "CLOSED" ? closureNotes : null,
        owner_user_id: userId as string,
      });
      res.status(201).json(data);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
    }
  });

  app.put(api.cases.update.path, async (req, res) => {
    const userId = getUserId(req);
    try {
      const input = api.cases.update.input.parse(req.body);
      const existing = await storage.getCase(req.params.id, userId as string);
      if (!existing?.case) return res.status(404).json({ message: "Case not found" });

      const statusFromInput = input.status !== undefined ? normalizeCaseStatus(input.status) : undefined;
      if (input.status !== undefined && !statusFromInput) {
        return res.status(400).json({ message: "status must be OPEN, HOLD, or CLOSED" });
      }

      const nextStatus = statusFromInput ?? normalizeCaseStatus(existing.case.status) ?? "OPEN";
      const conflictError = await ensureNoOpenTreatmentConflict(
        existing.case.patient_id,
        userId as string,
        nextStatus,
        existing.case.id,
      );
      if (conflictError) return res.status(400).json({ message: conflictError });

      const closureDateInput =
        input.closure_date === undefined ? undefined : normalizeNullableText(input.closure_date);
      const closureNotesInput =
        input.closure_notes === undefined ? undefined : normalizeNullableText(input.closure_notes);

      const nextClosureDate =
        closureDateInput !== undefined ? closureDateInput : (existing.case.closure_date ?? null);
      const nextClosureNotes =
        closureNotesInput !== undefined ? closureNotesInput : (existing.case.closure_notes ?? null);

      if (nextStatus === "CLOSED" && (!nextClosureDate || !nextClosureNotes)) {
        return res.status(400).json({
          message: "Closing a case requires both closure date and closing notes",
        });
      }

      if (input.case_title !== undefined && !String(input.case_title).trim()) {
        return res.status(400).json({ message: "case_title cannot be empty" });
      }

      const shouldValidateTypePair = input.treatment_type !== undefined || input.treatment_sub_type !== undefined;
      let treatmentPair: { treatmentType: string | null; treatmentSubType: string | null } | null = null;
      if (shouldValidateTypePair) {
        let nextTypeRaw: unknown =
          input.treatment_type !== undefined ? input.treatment_type : existing.case.treatment_type;
        let nextSubTypeRaw: unknown =
          input.treatment_sub_type !== undefined ? input.treatment_sub_type : existing.case.treatment_sub_type;
        if (
          input.treatment_type !== undefined &&
          normalizeNullableText(input.treatment_type) === null &&
          input.treatment_sub_type === undefined
        ) {
          nextSubTypeRaw = null;
        }
        const parsedPair = validateTreatmentTypePair(nextTypeRaw, nextSubTypeRaw);
        if (parsedPair.error) return res.status(400).json({ message: parsedPair.error });
        treatmentPair = { treatmentType: parsedPair.treatmentType, treatmentSubType: parsedPair.treatmentSubType };
      }

      const updatePayload: any = {
        ...input,
        status: nextStatus,
      };

      if (input.notes !== undefined) {
        updatePayload.notes = String(input.notes).trim() || null;
      }
      if (shouldValidateTypePair && treatmentPair) {
        updatePayload.treatment_type = treatmentPair.treatmentType;
        updatePayload.treatment_sub_type = treatmentPair.treatmentSubType;
      }

      if (nextStatus !== "CLOSED") {
        updatePayload.closure_date = null;
        updatePayload.closure_notes = null;
      } else {
        updatePayload.closure_date = nextClosureDate;
        updatePayload.closure_notes = nextClosureNotes;
      }

      const data = await storage.updateCase(req.params.id, userId as string, updatePayload);
      if (!data) return res.status(404).json({ message: "Case not found" });
      return res.json(data);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  });

  // Acknowledgments
  app.get(api.acknowledgments.list.path, async (req, res) => {
    const userId = getUserId(req);
    const data = await storage.getAcknowledgments(userId as string);
    res.json(data);
  });

  app.post(api.acknowledgments.create.path, async (req, res) => {
    const userId = getUserId(req);
    try {
      const input = api.acknowledgments.create.input.parse(req.body);
      const patientId = normalizeNullableText(input.patient_id);
      if (!patientId) {
        return res.status(400).json({ message: "patient_id is required to create an acknowledgment" });
      }
      const amountFinal = toNumber(input.amount_final);
      const amountPaid = toNumber(input.amount_paid);

      if (!Number.isFinite(amountFinal) || amountFinal < 0) {
        return res.status(400).json({ message: "amount_final must be a number greater than or equal to 0" });
      }
      if (!Number.isFinite(amountPaid) || amountPaid < 0) {
        return res.status(400).json({ message: "amount_paid must be a number greater than or equal to 0" });
      }

      const latestAck = await storage.getLatestAcknowledgment(
        patientId,
        String(input.facility_id),
        userId as string,
      );
      const previousBalance = latestAck
        ? (Number.isFinite(toNumber(latestAck.balance))
            ? toNumber(latestAck.balance)
            : null)
        : null;
      const baseBalance = previousBalance != null ? previousBalance : amountFinal;

      if (amountPaid > baseBalance) {
        return res.status(400).json({
          message: previousBalance != null
            ? "Amount paid cannot be greater than previous balance"
            : "Amount paid cannot be greater than final amount",
        });
      }

      const split = computeSplitAmounts(amountPaid, input.split_agreed);
      const balance = (baseBalance - amountPaid).toFixed(2);
      const activeTreatment = await storage.getOpenCaseForPatient(patientId, userId as string);
      if (!activeTreatment) {
        return res.status(400).json({
          message: "No OPEN treatment found for this patient. Create or reopen a treatment first.",
        });
      }
      const data = await storage.createAcknowledgment({
        ...input,
        patient_id: patientId,
        case_ref: activeTreatment.id,
        balance,
        visiting_doc_share: split.visitingAmountText,
        owner_user_id: userId as string,
      });

      return res.status(201).json(data);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      if (e?.code === "23505") {
        return res.status(409).json({
          message: "Acknowledgment number already exists",
          code: e.code,
        });
      }
      return res.status(500).json({ message: e.message });
    }
  });

  app.delete(api.acknowledgments.delete.path, async (req, res) => {
    const userId = getUserId(req);
    await storage.deleteAcknowledgment(req.params.id, userId as string);
    res.status(204).send();
  });

  app.get(api.acknowledgments.latest.path, async (req, res) => {
    const userId = getUserId(req);
    const patientId = typeof req.query.patient_id === "string" ? req.query.patient_id : "";
    const facilityId = typeof req.query.facility_id === "string" ? req.query.facility_id : "";
    if (!patientId || !facilityId) {
      return res.status(400).json({ message: "patient_id and facility_id are required" });
    }
    const data = await storage.getLatestAcknowledgment(patientId, facilityId, userId as string);
    return res.json(data);
  });

  app.post(api.acknowledgments.generatePdf.path, async (req, res) => {
    const userId = getUserId(req);
    const adminName = getUserDisplayName(req);
    const id = req.params.id;
    const record = await getAckReceiptRecord(id, userId as string);
    if (!record) return res.status(404).json({ message: "Acknowledgment not found" });
    try {
      const fullPath = await generateHistoryReceiptPdf(record, userId as string, adminName);
      return res.sendFile(fullPath, (err) => {
        if (err && !res.headersSent) {
          res.status(500).json({ message: "Failed to generate history PDF" });
        }
      });
    } catch (e: any) {
      return res.status(400).json({ message: e?.message || "Failed to generate history PDF" });
    }
  });

  app.get(api.acknowledgments.viewPdf.path, async (req, res) => {
    const userId = getUserId(req);
    const adminName = getUserDisplayName(req);
    const record = await getAckReceiptRecord(req.params.id, userId as string);
    if (!record) return res.status(404).json({ message: "PDF not found" });
    const fullPath = await generateSingleReceiptPdf(req.params.id, userId as string, record, adminName);

    res.sendFile(fullPath, (err) => {
      if (err) {
        if (!res.headersSent) {
          res.status(404).json({ message: "PDF file missing on server" });
        }
      }
    });
  });

  return httpServer;
}
