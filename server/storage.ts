import { db } from "./db";
import {
  facilities, patients, ack_docs, patient_facilities, cases,
  type InsertFacility, type InsertPatient, type InsertAckDoc, type InsertPatientFacility, type InsertCase
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Facilities
  getFacilities(userId: string): Promise<typeof facilities.$inferSelect[]>;
  getFacility(id: number, userId: string): Promise<any>;
  createFacility(facility: InsertFacility & { owner_user_id: string }): Promise<typeof facilities.$inferSelect>;
  updateFacility(id: number, userId: string, facility: Partial<InsertFacility>): Promise<typeof facilities.$inferSelect | undefined>;
  deleteFacility(id: number, userId: string): Promise<void>;

  // Patients
  getPatients(userId: string): Promise<any[]>;
  getPatient(id: number, userId: string): Promise<any>;
  createPatient(patient: InsertPatient & { owner_user_id: string }): Promise<typeof patients.$inferSelect>;
  updatePatient(id: number, userId: string, patient: Partial<InsertPatient>): Promise<typeof patients.$inferSelect | undefined>;
  deletePatient(id: number, userId: string): Promise<void>;
  linkPatientToFacility(link: InsertPatientFacility & { owner_user_id: string }): Promise<typeof patient_facilities.$inferSelect>;

  // Acknowledgments
  getAcknowledgments(userId: string): Promise<any[]>;
  createAcknowledgment(ack: InsertAckDoc & { owner_user_id: string, ack_no: string }): Promise<typeof ack_docs.$inferSelect>;
  deleteAcknowledgment(id: number, userId: string): Promise<void>;

  // Cases
  getCases(userId: string): Promise<any[]>;
  getCase(id: number, userId: string): Promise<any>;
  createCase(data: InsertCase & { owner_user_id: string }): Promise<typeof cases.$inferSelect>;
}

export class DatabaseStorage implements IStorage {
  async getFacilities(userId: string) {
    return await db.select().from(facilities).where(eq(facilities.owner_user_id, userId));
  }

  async getFacility(id: number, userId: string) {
    const [facility] = await db.select().from(facilities).where(and(eq(facilities.id, id), eq(facilities.owner_user_id, userId)));
    if (!facility) return null;

    const linkedPatients = await db.select({
      id: patients.id,
      name_or_code: patients.name_or_code,
      is_primary: patient_facilities.is_primary
    })
    .from(patient_facilities)
    .innerJoin(patients, eq(patient_facilities.patient_id, patients.id))
    .where(and(eq(patient_facilities.facility_id, id), eq(patient_facilities.owner_user_id, userId)));

    const facilityAcks = await db.select().from(ack_docs).where(and(eq(ack_docs.facility_id, id), eq(ack_docs.owner_user_id, userId)));
    const facilityCases = await db.select().from(cases).where(and(eq(cases.primary_facility_id, id), eq(cases.owner_user_id, userId)));

    return { facility, patients: linkedPatients, acknowledgments: facilityAcks, cases: facilityCases };
  }

  async createFacility(facility: InsertFacility & { owner_user_id: string }) {
    const [item] = await db.insert(facilities).values(facility).returning();
    return item;
  }

  async updateFacility(id: number, userId: string, update: Partial<InsertFacility>) {
    const [item] = await db.update(facilities)
      .set(update)
      .where(and(eq(facilities.id, id), eq(facilities.owner_user_id, userId)))
      .returning();
    return item;
  }

  async deleteFacility(id: number, userId: string) {
    await db.delete(facilities).where(and(eq(facilities.id, id), eq(facilities.owner_user_id, userId)));
  }

  async getPatients(userId: string) {
    const allPatients = await db.select().from(patients).where(eq(patients.owner_user_id, userId));
    const results = [];
    for (const p of allPatients) {
      const [primaryLink] = await db.select({
        facility_id: facilities.id,
        facility_name: facilities.facility_name
      })
      .from(patient_facilities)
      .innerJoin(facilities, eq(patient_facilities.facility_id, facilities.id))
      .where(and(eq(patient_facilities.patient_id, p.id), eq(patient_facilities.is_primary, true)));
      
      results.push({ ...p, primary_facility: primaryLink || null });
    }
    return results;
  }

  async getPatient(id: number, userId: string) {
    const [patient] = await db.select().from(patients).where(and(eq(patients.id, id), eq(patients.owner_user_id, userId)));
    if (!patient) return null;

    const linkedFacilities = await db.select({
      id: facilities.id,
      facility_name: facilities.facility_name,
      is_primary: patient_facilities.is_primary
    })
    .from(patient_facilities)
    .innerJoin(facilities, eq(patient_facilities.facility_id, facilities.id))
    .where(and(eq(patient_facilities.patient_id, id), eq(patient_facilities.owner_user_id, userId)));

    const patientAcks = await db.select().from(ack_docs).where(and(eq(ack_docs.patient_id, id), eq(ack_docs.owner_user_id, userId)));
    const patientCases = await db.select().from(cases).where(and(eq(cases.patient_id, id), eq(cases.owner_user_id, userId)));

    return { patient, facilities: linkedFacilities, acknowledgments: patientAcks, cases: patientCases };
  }

  async createPatient(patient: InsertPatient & { owner_user_id: string }) {
    const [item] = await db.insert(patients).values(patient).returning();
    return item;
  }

  async updatePatient(id: number, userId: string, update: Partial<InsertPatient>) {
    const [item] = await db.update(patients)
      .set(update)
      .where(and(eq(patients.id, id), eq(patients.owner_user_id, userId)))
      .returning();
    return item;
  }

  async deletePatient(id: number, userId: string) {
    await db.delete(patients).where(and(eq(patients.id, id), eq(patients.owner_user_id, userId)));
  }

  async linkPatientToFacility(link: InsertPatientFacility & { owner_user_id: string }) {
    if (link.is_primary) {
      await db.update(patient_facilities)
        .set({ is_primary: false })
        .where(and(eq(patient_facilities.patient_id, link.patient_id), eq(patient_facilities.owner_user_id, link.owner_user_id)));
    }
    const [item] = await db.insert(patient_facilities).values(link).returning();
    return item;
  }

  async getAcknowledgments(userId: string) {
    return await db.select({
      ack: ack_docs,
      facility_name: facilities.facility_name,
      patient_name: patients.name_or_code
    })
    .from(ack_docs)
    .leftJoin(facilities, eq(ack_docs.facility_id, facilities.id))
    .leftJoin(patients, eq(ack_docs.patient_id, patients.id))
    .where(eq(ack_docs.owner_user_id, userId))
    .orderBy(desc(ack_docs.ack_date));
  }

  async createAcknowledgment(ack: InsertAckDoc & { owner_user_id: string, ack_no: string }) {
    const [item] = await db.insert(ack_docs).values(ack).returning();
    return item;
  }

  async deleteAcknowledgment(id: number, userId: string) {
    await db.delete(ack_docs).where(and(eq(ack_docs.id, id), eq(ack_docs.owner_user_id, userId)));
  }

  async getCases(userId: string) {
    return await db.select({
      case: cases,
      patient_name: patients.name_or_code,
      facility_name: facilities.facility_name
    })
    .from(cases)
    .innerJoin(patients, eq(cases.patient_id, patients.id))
    .leftJoin(facilities, eq(cases.primary_facility_id, facilities.id))
    .where(eq(cases.owner_user_id, userId))
    .orderBy(desc(cases.created_at));
  }

  async getCase(id: number, userId: string) {
    const [c] = await db.select({
      case: cases,
      patient_name: patients.name_or_code,
      facility_name: facilities.facility_name
    })
    .from(cases)
    .innerJoin(patients, eq(cases.patient_id, patients.id))
    .leftJoin(facilities, eq(cases.primary_facility_id, facilities.id))
    .where(and(eq(cases.id, id), eq(cases.owner_user_id, userId)));
    return c;
  }

  async createCase(data: InsertCase & { owner_user_id: string }) {
    const [item] = await db.insert(cases).values(data).returning();
    return item;
  }
}

export const storage = new DatabaseStorage();
