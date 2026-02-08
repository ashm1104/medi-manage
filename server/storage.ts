import { db } from "./db";
import {
  facilities, patients, ack_docs,
  type InsertFacility, type InsertPatient, type InsertAckDoc
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Facilities
  getFacilities(userId: string): Promise<typeof facilities.$inferSelect[]>;
  createFacility(facility: InsertFacility & { owner_user_id: string }): Promise<typeof facilities.$inferSelect>;
  updateFacility(id: number, userId: string, facility: Partial<InsertFacility>): Promise<typeof facilities.$inferSelect | undefined>;
  deleteFacility(id: number, userId: string): Promise<void>;

  // Patients
  getPatients(userId: string): Promise<typeof patients.$inferSelect[]>;
  createPatient(patient: InsertPatient & { owner_user_id: string }): Promise<typeof patients.$inferSelect>;
  updatePatient(id: number, userId: string, patient: Partial<InsertPatient>): Promise<typeof patients.$inferSelect | undefined>;
  deletePatient(id: number, userId: string): Promise<void>;

  // Acknowledgments
  getAcknowledgments(userId: string): Promise<typeof ack_docs.$inferSelect[]>;
  createAcknowledgment(ack: InsertAckDoc & { owner_user_id: string, ack_no: string }): Promise<typeof ack_docs.$inferSelect>;
  deleteAcknowledgment(id: number, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Facilities
  async getFacilities(userId: string) {
    return await db.select().from(facilities).where(eq(facilities.owner_user_id, userId));
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

  // Patients
  async getPatients(userId: string) {
    return await db.select().from(patients).where(eq(patients.owner_user_id, userId));
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

  // Acknowledgments
  async getAcknowledgments(userId: string) {
    return await db.select().from(ack_docs).where(eq(ack_docs.owner_user_id, userId)).orderBy(desc(ack_docs.ack_date));
  }

  async createAcknowledgment(ack: InsertAckDoc & { owner_user_id: string, ack_no: string }) {
    const [item] = await db.insert(ack_docs).values(ack).returning();
    return item;
  }

  async deleteAcknowledgment(id: number, userId: string) {
    await db.delete(ack_docs).where(and(eq(ack_docs.id, id), eq(ack_docs.owner_user_id, userId)));
  }
}

export const storage = new DatabaseStorage();
