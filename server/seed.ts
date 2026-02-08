
import { db } from "./db";
import { facilities, patients, ack_docs } from "@shared/schema";

async function seed() {
  const userId = "demo-user"; // Matching the fallback in routes.ts

  // Check if data exists
  const existingFacilities = await db.select().from(facilities);
  if (existingFacilities.length > 0) {
    console.log("Database already seeded");
    return;
  }

  // Create Facilities
  const facilityData = [
    {
      facility_name: "General Hospital",
      host_doctor_name: "Dr. Smith",
      type: "HOSPITAL",
      address: "123 Main St, Cityville",
      phone: "555-0101",
      owner_user_id: userId
    },
    {
      facility_name: "Downtown Clinic",
      host_doctor_name: "Dr. Jones",
      type: "CLINIC",
      address: "456 Market Ave, Cityville",
      phone: "555-0102",
      owner_user_id: userId
    },
    {
      facility_name: "Westside Medical Center",
      host_doctor_name: "Dr. Emily Chen",
      type: "HOSPITAL",
      address: "789 West Blvd, Cityville",
      phone: "555-0103",
      owner_user_id: userId
    }
  ];

  const createdFacilities = await db.insert(facilities).values(facilityData).returning();
  console.log("Seeded facilities");

  // Create Patients
  const patientData = [
    {
      name_or_code: "John Doe",
      phone: "555-1001",
      notes: "Regular checkups",
      owner_user_id: userId
    },
    {
      name_or_code: "Jane Roe",
      phone: "555-1002",
      notes: "Allergic to penicillin",
      owner_user_id: userId
    },
    {
      name_or_code: "P-1003",
      phone: "555-1003",
      notes: "Private patient",
      owner_user_id: userId
    }
  ];

  const createdPatients = await db.insert(patients).values(patientData).returning();
  console.log("Seeded patients");

  // Create Acknowledgments
  const ackData = [
    {
      ack_no: "ACK-20231001-1234",
      ack_type: "VISIT",
      facility_id: createdFacilities[0].id,
      patient_id: createdPatients[0].id,
      case_ref: "CASE-001",
      split_agreed: "60/40",
      ack_date: new Date().toISOString(),
      amount_final: "150.00",
      amount_paid: "100.00",
      notes: "Initial consultation",
      owner_user_id: userId
    },
    {
      ack_no: "ACK-20231002-5678",
      ack_type: "PAYMENT",
      facility_id: createdFacilities[1].id,
      patient_id: createdPatients[1].id,
      case_ref: "CASE-002",
      split_agreed: "50/50",
      ack_date: new Date().toISOString(),
      amount_final: "200.00",
      amount_paid: "200.00",
      notes: "Follow-up visit, fully paid",
      owner_user_id: userId
    }
  ];

  await db.insert(ack_docs).values(ackData);
  console.log("Seeded acknowledgments");
}

seed().catch(console.error);
