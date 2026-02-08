import { pgTable, text, serial, integer, boolean, timestamp, date, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const facilityTypeEnum = pgEnum("facility_type", ["HOSPITAL", "CLINIC"]);
export const ackTypeEnum = pgEnum("ack_type", ["VISIT", "PAYMENT", "BOTH"]);

export const facilities = pgTable("facilities", {
  id: serial("id").primaryKey(),
  facility_name: text("facility_name").notNull(),
  host_doctor_name: text("host_doctor_name"),
  type: text("type").notNull(), // Using text to simplify, but validating with enum logic if needed
  address: text("address"),
  phone: text("phone"),
  owner_user_id: text("owner_user_id").notNull(),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name_or_code: text("name_or_code").notNull(),
  phone: text("phone"),
  notes: text("notes"),
  owner_user_id: text("owner_user_id").notNull(),
});

export const ack_docs = pgTable("ack_docs", {
  id: serial("id").primaryKey(),
  ack_no: text("ack_no").notNull(), // ACK-YYYYMMDD-####
  ack_type: text("ack_type").notNull(), // VISIT, PAYMENT, BOTH
  facility_id: integer("facility_id").references(() => facilities.id).notNull(),
  patient_id: integer("patient_id").references(() => patients.id),
  case_ref: text("case_ref"),
  split_agreed: text("split_agreed"), // e.g. "60/40"
  ack_date: date("ack_date").notNull(),
  amount_final: numeric("amount_final").notNull(),
  amount_paid: numeric("amount_paid").notNull(),
  // Balance is calculated, not necessarily stored, but we can store it or compute it
  notes: text("notes"),
  owner_user_id: text("owner_user_id").notNull(),
});

// Schemas
export const insertFacilitySchema = createInsertSchema(facilities).omit({ 
  id: true, 
  owner_user_id: true 
});

export const insertPatientSchema = createInsertSchema(patients).omit({ 
  id: true, 
  owner_user_id: true 
});

export const insertAckDocSchema = createInsertSchema(ack_docs).omit({ 
  id: true, 
  owner_user_id: true,
  ack_no: true // Auto-generated
});

// Types
export type Facility = typeof facilities.$inferSelect;
export type InsertFacility = z.infer<typeof insertFacilitySchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type AckDoc = typeof ack_docs.$inferSelect;
export type InsertAckDoc = z.infer<typeof insertAckDocSchema>;
