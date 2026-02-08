import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

// Helper to generate ACK number: ACK-YYYYMMDD-####
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
  
  // Middleware to simulate Auth (or verify Supabase token if we were doing strict backend auth)
  // For this demo, we'll assume the client sends a user_id header or we fallback to a demo user
  // In a real Supabase backend app, we'd verify the JWT here.
  const getUserId = (req: any) => {
    // Check for a simulated user ID or header
    // In production with Supabase, verify the Bearer token
    return req.headers['x-user-id'] || 'demo-user';
  };

  // Facilities
  app.get(api.facilities.list.path, async (req, res) => {
    const userId = getUserId(req);
    const data = await storage.getFacilities(userId as string);
    res.json(data);
  });

  app.post(api.facilities.create.path, async (req, res) => {
    const userId = getUserId(req);
    try {
      const input = api.facilities.create.input.parse(req.body);
      const data = await storage.createFacility({ ...input, owner_user_id: userId as string });
      res.status(201).json(data);
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json(e.errors);
      } else {
        throw e;
      }
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
      if (e instanceof z.ZodError) {
        res.status(400).json(e.errors);
      } else {
        throw e;
      }
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

  app.post(api.patients.create.path, async (req, res) => {
    const userId = getUserId(req);
    try {
      const input = api.patients.create.input.parse(req.body);
      const data = await storage.createPatient({ ...input, owner_user_id: userId as string });
      res.status(201).json(data);
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json(e.errors);
      } else {
        throw e;
      }
    }
  });

  app.put(api.patients.update.path, async (req, res) => {
    const userId = getUserId(req);
    try {
      const input = api.patients.update.input.parse(req.body);
      const data = await storage.updatePatient(Number(req.params.id), userId as string, input);
      if (!data) return res.status(404).json({ message: "Not found" });
      res.json(data);
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json(e.errors);
      } else {
        throw e;
      }
    }
  });

  app.delete(api.patients.delete.path, async (req, res) => {
    const userId = getUserId(req);
    await storage.deletePatient(Number(req.params.id), userId as string);
    res.status(204).send();
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
      const ack_no = generateAckNumber();
      const data = await storage.createAcknowledgment({ 
        ...input, 
        owner_user_id: userId as string,
        ack_no 
      });
      res.status(201).json(data);
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json(e.errors);
      } else {
        throw e;
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
