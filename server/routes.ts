import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

function generateAckNumber(): string {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ACK-${yyyy}${mm}${dd}-${random}`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  const getUserId = (req: any) => {
    return req.headers['x-user-id'] || 'demo-user';
  };

  // Facilities
  app.get(api.facilities.list.path, async (req, res) => {
    const userId = getUserId(req);
    const data = await storage.getFacilities(userId as string);
    res.json(data);
  });

  app.get(api.facilities.get.path, async (req, res) => {
    const userId = getUserId(req);
    const data = await storage.getFacility(Number(req.params.id), userId as string);
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
      const data = await storage.updateFacility(Number(req.params.id), userId as string, input);
      if (!data) return res.status(404).json({ message: "Not found" });
      res.json(data);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
    }
  });

  app.delete(api.facilities.delete.path, async (req, res) => {
    const userId = getUserId(req);
    await storage.deleteFacility(Number(req.params.id), userId as string);
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
    const data = await storage.getPatient(Number(req.params.id), userId as string);
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

  app.post(api.patients.linkFacility.path, async (req, res) => {
    const userId = getUserId(req);
    try {
      const input = api.patients.linkFacility.input.parse(req.body);
      const data = await storage.linkPatientToFacility({ 
        ...input, 
        patient_id: Number(req.params.id),
        owner_user_id: userId as string 
      });
      res.status(201).json(data);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
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
    const data = await storage.getCase(Number(req.params.id), userId as string);
    if (!data) return res.status(404).json({ message: "Case not found" });
    res.json(data);
  });

  app.post(api.cases.create.path, async (req, res) => {
    const userId = getUserId(req);
    try {
      const input = api.cases.create.input.parse(req.body);
      const data = await storage.createCase({ ...input, owner_user_id: userId as string });
      res.status(201).json(data);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
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
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      try {
        const input = api.acknowledgments.create.input.parse(req.body);
        const ack_no = generateAckNumber();
        const data = await storage.createAcknowledgment({ 
          ...input, 
          owner_user_id: userId as string,
          ack_no 
        });
        return res.status(201).json(data);
      } catch (e: any) {
        if (e.code === '23505' && attempts < maxAttempts - 1) {
          attempts++;
          continue;
        }
        if (e instanceof z.ZodError) return res.status(400).json(e.errors);
        return res.status(500).json({ message: e.message });
      }
    }
  });

  app.delete(api.acknowledgments.delete.path, async (req, res) => {
    const userId = getUserId(req);
    await storage.deleteAcknowledgment(Number(req.params.id), userId as string);
    res.status(204).send();
  });

  return httpServer;
}
