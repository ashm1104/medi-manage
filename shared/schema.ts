import { pgTable, text, serial, integer, boolean, timestamp, date, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const facilityTypeEnum = pgEnum("facility_type", ["HOSPITAL", "CLINIC"]);
export const ackTypeEnum = pgEnum("ack_type", ["VISIT", "PAYMENT", "BOTH"]);
export const caseStatusEnum = pgEnum("case_status", ["OPEN", "CLOSED"]);

export const facilities = pgTable("facilities", {
  id: serial("id").primaryKey(),
  facility_name: text("facility_name").notNull(),
  host_doctor_name: text("host_doctor_name"),
  type: text("type").notNull(), 
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

export const patient_facilities = pgTable("patient_facilities", {
  id: serial("id").primaryKey(),
  patient_id: integer("patient_id").references(() => patients.id).notNull(),
  facility_id: integer("facility_id").references(() => facilities.id).notNull(),
  is_primary: boolean("is_primary").default(false).notNull(),
  notes: text("notes"),
  owner_user_id: text("owner_user_id").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  patient_id: integer("patient_id").references(() => patients.id).notNull(),
  primary_facility_id: integer("primary_facility_id").references(() => facilities.id),
  case_title: text("case_title").notNull(),
  status: text("status").default("OPEN").notNull(),
  start_date: date("start_date").notNull(),
  notes: text("notes"),
  owner_user_id: text("owner_user_id").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const ack_docs = pgTable("ack_docs", {
  id: serial("id").primaryKey(),
  ack_no: text("ack_no").notNull().unique(), 
  ack_type: text("ack_type").notNull(), 
  facility_id: integer("facility_id").references(() => facilities.id).notNull(),
  patient_id: integer("patient_id").references(() => patients.id),
  case_ref: text("case_ref"),
  split_agreed: text("split_agreed"), 
  ack_date: date("ack_date").notNull(),
  amount_final: numeric("amount_final").notNull(),
  amount_paid: numeric("amount_paid").notNull(),
  notes: text("notes"),
  owner_user_id: text("owner_user_id").notNull(),
});

// Schemas
export const insertFacilitySchema = createInsertSchema(facilities).omit({ id: true, owner_user_id: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, owner_user_id: true });
export const insertPatientFacilitySchema = createInsertSchema(patient_facilities).omit({ id: true, owner_user_id: true, created_at: true });
export const insertCaseSchema = createInsertSchema(cases).omit({ id: true, owner_user_id: true, created_at: true });
export const insertAckDocSchema = createInsertSchema(ack_docs).omit({ id: true, owner_user_id: true, ack_no: true });

// Types
export type Facility = typeof facilities.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type PatientFacility = typeof patient_facilities.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type AckDoc = typeof ack_docs.$inferSelect;
