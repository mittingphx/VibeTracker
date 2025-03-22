import express, { type Express, Request, Response } from "express";
import { Server, createServer } from "http";
import { storage } from "./storage";
import { insertTimerSchema, insertTimerHistorySchema } from "@shared/schema";
import { format } from "date-fns";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();

  // Get all enhanced timers
  router.get("/timers", async (req: Request, res: Response) => {
    try {
      const timers = await storage.getEnhancedTimers();
      res.json(timers);
    } catch (error) {
      console.error("Error fetching timers:", error);
      res.status(500).json({ message: "Failed to fetch timers" });
    }
  });

  // Get timer by ID
  router.get("/timers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid timer ID" });
      }

      const timer = await storage.getTimer(id);
      if (!timer) {
        return res.status(404).json({ message: "Timer not found" });
      }

      res.json(timer);
    } catch (error) {
      console.error("Error fetching timer:", error);
      res.status(500).json({ message: "Failed to fetch timer" });
    }
  });

  // Create new timer
  router.post("/timers", async (req: Request, res: Response) => {
    try {
      const validatedData = insertTimerSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const newTimer = await storage.createTimer(validatedData.data);
      res.status(201).json(newTimer);
    } catch (error) {
      console.error("Error creating timer:", error);
      res.status(500).json({ message: "Failed to create timer" });
    }
  });

  // Update timer
  router.patch("/timers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid timer ID" });
      }

      // Validate partial data
      const validatedData = insertTimerSchema.partial().safeParse(req.body);
      
      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const updatedTimer = await storage.updateTimer(id, validatedData.data);
      if (!updatedTimer) {
        return res.status(404).json({ message: "Timer not found" });
      }
      
      res.json(updatedTimer);
    } catch (error) {
      console.error("Error updating timer:", error);
      res.status(500).json({ message: "Failed to update timer" });
    }
  });

  // Delete timer
  router.delete("/timers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid timer ID" });
      }

      const success = await storage.deleteTimer(id);
      if (!success) {
        return res.status(404).json({ message: "Timer not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting timer:", error);
      res.status(500).json({ message: "Failed to delete timer" });
    }
  });

  // Record timer press
  router.post("/timers/:id/press", async (req: Request, res: Response) => {
    try {
      const timerId = parseInt(req.params.id);
      if (isNaN(timerId)) {
        return res.status(400).json({ message: "Invalid timer ID" });
      }

      const timer = await storage.getTimer(timerId);
      if (!timer) {
        return res.status(404).json({ message: "Timer not found" });
      }

      // Create history record
      const history = await storage.createTimerHistory({ 
        timerId,
        isActive: true
      });
      
      // Get updated enhanced timer
      const enhancedTimers = await storage.getEnhancedTimers();
      const updatedTimer = enhancedTimers.find(t => t.id === timerId);
      
      res.status(201).json({ history, timer: updatedTimer });
    } catch (error) {
      console.error("Error recording timer press:", error);
      res.status(500).json({ message: "Failed to record timer press" });
    }
  });

  // Undo/redo timer press (toggle isActive)
  router.patch("/history/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid history ID" });
      }

      // Validate that isActive is provided
      const schema = z.object({ isActive: z.boolean() });
      const validatedData = schema.safeParse(req.body);
      
      if (!validatedData.success) {
        return res.status(400).json({ message: "isActive field is required and must be a boolean" });
      }
      
      const updatedHistory = await storage.updateTimerHistory(id, validatedData.data.isActive);
      if (!updatedHistory) {
        return res.status(404).json({ message: "History record not found" });
      }
      
      // Get enhanced timers to return with updated state
      const enhancedTimers = await storage.getEnhancedTimers();
      
      res.json({ 
        history: updatedHistory,
        timers: enhancedTimers
      });
    } catch (error) {
      console.error("Error updating history record:", error);
      res.status(500).json({ message: "Failed to update history record" });
    }
  });

  // Get timer history
  router.get("/timers/:id/history", async (req: Request, res: Response) => {
    try {
      const timerId = parseInt(req.params.id);
      if (isNaN(timerId)) {
        return res.status(400).json({ message: "Invalid timer ID" });
      }

      const history = await storage.getTimerHistory(timerId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching timer history:", error);
      res.status(500).json({ message: "Failed to fetch timer history" });
    }
  });

  // Get timer history by date range
  router.get("/history", async (req: Request, res: Response) => {
    try {
      const startDateParam = req.query.startDate as string;
      const endDateParam = req.query.endDate as string;
      
      if (!startDateParam || !endDateParam) {
        return res.status(400).json({ message: "startDate and endDate query parameters are required" });
      }
      
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format. Use ISO format (YYYY-MM-DD)" });
      }
      
      // Set end date to end of day
      endDate.setHours(23, 59, 59, 999);
      
      const history = await storage.getTimerHistoryByDateRange(startDate, endDate);
      res.json(history);
    } catch (error) {
      console.error("Error fetching history by date range:", error);
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  // Register the router with prefix
  app.use("/api", router);

  const httpServer = createServer(app);
  return httpServer;
}
