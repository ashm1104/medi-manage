import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { computeSplitAmounts, toNumber } from "./ack-utils";
import { writeAcknowledgmentPdf } from "./pdf";
import { db } from "./db";
import { ack_docs, cases, facilities, patients } from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";
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

  const getUserIdFromJwt = (token: string): string | null => {
    try {
      const parts = token.split(".");
      if (parts.length < 2) return null;
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      const sub = payload?.sub;
      return typeof sub === "string" && isUuid(sub) ? sub : null;
    } catch {
      return null;
    }
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
      const closureDate = input.closure_date ? String(input.closure_date) : null;
      const closureNotes = input.closure_notes ? String(input.closure_notes).trim() : null;

      if (status === "CLOSED" && (!closureDate || !closureNotes)) {
        return res.status(400).json({
          message: "Closing a case requires both closure date and closing notes",
        });
      }

      const data = await storage.createCase({
        ...input,
        status,
        notes: input.notes ? String(input.notes).trim() : null,
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
      const closureDateInput =
        input.closure_date === undefined ? undefined : (input.closure_date ? String(input.closure_date) : null);
      const closureNotesInput =
        input.closure_notes === undefined ? undefined : (String(input.closure_notes).trim() || null);

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

      const updatePayload: any = {
        ...input,
        status: nextStatus,
      };

      if (input.notes !== undefined) {
        updatePayload.notes = String(input.notes).trim() || null;
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
      const amountFinal = toNumber(input.amount_final);
      const amountPaid = toNumber(input.amount_paid);

      if (!Number.isFinite(amountFinal) || amountFinal < 0) {
        return res.status(400).json({ message: "amount_final must be a number greater than or equal to 0" });
      }
      if (!Number.isFinite(amountPaid) || amountPaid < 0) {
        return res.status(400).json({ message: "amount_paid must be a number greater than or equal to 0" });
      }

      const latestAck = await storage.getLatestAcknowledgment(
        String(input.patient_id ?? ""),
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
      const data = await storage.createAcknowledgment({
        ...input,
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
    const id = req.params.id;

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

    if (!record) return res.status(404).json({ message: "Acknowledgment not found" });

    const amountFinal = toNumber(record.ack.amount_final);
    const amountPaid = toNumber(record.ack.amount_paid);
    const balance = Number.isFinite(toNumber(record.ack.balance)) ? toNumber(record.ack.balance) : 0;
    const split = computeSplitAmounts(amountPaid, record.ack.split_agreed);

    const splitLabel = split.parsed ? `${split.parsed.hostPct}/${split.parsed.visitPct}` : "NA";
    const nowIso = new Date().toISOString();
    const fullPath = await writeAcknowledgmentPdf(record.ack.ack_no, {
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
    const relativePath = path.relative(process.cwd(), fullPath).replaceAll("\\", "/");
    const pdfPath = `/${relativePath}`;

    await storage.updateAcknowledgment(id, userId as string, {
      pdf_path: pdfPath,
      visiting_doc_share: split.visitingAmountText,
    });

    return res.json({ pdf_path: pdfPath });
  });

  app.get(api.acknowledgments.viewPdf.path, async (req, res) => {
    const userId = getUserId(req);
    const ack = await storage.getAcknowledgment(req.params.id, userId as string);
    if (!ack || !ack.pdf_path) return res.status(404).json({ message: "PDF not found" });

    const fullPath = path.resolve(process.cwd(), ack.pdf_path.replace(/^\//, ""));
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
