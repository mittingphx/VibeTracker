import express, { type Express, Request, Response, NextFunction } from "express";
import { Server, createServer } from "http";
import { storage } from "./storage";
import { insertTimerSchema, insertTimerHistorySchema, timers, timerHistory } from "@shared/schema";
import { format } from "date-fns";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth-fixed";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication before route registration
  setupAuth(app);
  
  const router = express.Router();
  
  // Authentication middleware for protected routes
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Get all enhanced timers
  router.get("/timers", requireAuth, async (req: Request, res: Response) => {
    try {
      const includeArchived = req.query.includeArchived === 'true';
      // Get user ID from authenticated user
      const userId = req.user!.id;
      const timers = await storage.getEnhancedTimersByUserId(userId, includeArchived);
      res.json(timers);
    } catch (error) {
      console.error("Error fetching timers:", error);
      res.status(500).json({ message: "Failed to fetch timers" });
    }
  });
  
  // Get archived timers
  router.get("/timers/archived", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const archivedTimers = await storage.getArchivedTimersByUserId(userId);
      res.json(archivedTimers);
    } catch (error) {
      console.error("Error fetching archived timers:", error);
      res.status(500).json({ message: "Failed to fetch archived timers" });
    }
  });

  // Get timer by ID
  router.get("/timers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid timer ID" });
      }

      const timer = await storage.getTimer(id);
      if (!timer) {
        return res.status(404).json({ message: "Timer not found" });
      }
      
      // Check if this timer belongs to the authenticated user
      if (timer.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to access this timer" });
      }

      res.json(timer);
    } catch (error) {
      console.error("Error fetching timer:", error);
      res.status(500).json({ message: "Failed to fetch timer" });
    }
  });

  // Create new timer
  router.post("/timers", requireAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = insertTimerSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Add the user ID to the timer data
      const timerData = {
        ...validatedData.data,
        userId: req.user!.id
      };
      
      const newTimer = await storage.createTimer(timerData);
      res.status(201).json(newTimer);
    } catch (error) {
      console.error("Error creating timer:", error);
      res.status(500).json({ message: "Failed to create timer" });
    }
  });

  // Update timer
  router.patch("/timers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid timer ID" });
      }

      // First check if the timer exists and belongs to the authenticated user
      const existingTimer = await storage.getTimer(id);
      if (!existingTimer) {
        return res.status(404).json({ message: "Timer not found" });
      }
      
      // Verify ownership
      if (existingTimer.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to update this timer" });
      }

      // Validate partial data
      const validatedData = insertTimerSchema.partial().safeParse(req.body);
      
      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Prevent changing userId
      if (validatedData.data.userId && validatedData.data.userId !== req.user!.id) {
        return res.status(400).json({ message: "Cannot change timer ownership" });
      }
      
      const updatedTimer = await storage.updateTimer(id, validatedData.data);
      res.json(updatedTimer);
    } catch (error) {
      console.error("Error updating timer:", error);
      res.status(500).json({ message: "Failed to update timer" });
    }
  });

  // Archive timer (instead of deleting)
  router.post("/timers/:id/archive", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid timer ID" });
      }

      // First check if the timer exists and belongs to the authenticated user
      const existingTimer = await storage.getTimer(id);
      if (!existingTimer) {
        return res.status(404).json({ message: "Timer not found" });
      }
      
      // Verify ownership
      if (existingTimer.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to archive this timer" });
      }

      const archivedTimer = await storage.archiveTimer(id);
      res.json(archivedTimer);
    } catch (error) {
      console.error("Error archiving timer:", error);
      res.status(500).json({ message: "Failed to archive timer" });
    }
  });
  
  // Restore timer from archive
  router.post("/timers/:id/restore", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid timer ID" });
      }

      // First check if the timer exists and belongs to the authenticated user
      const existingTimer = await storage.getTimer(id);
      if (!existingTimer) {
        return res.status(404).json({ message: "Timer not found" });
      }
      
      // Verify ownership
      if (existingTimer.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to restore this timer" });
      }

      const restoredTimer = await storage.restoreTimer(id);
      res.json(restoredTimer);
    } catch (error) {
      console.error("Error restoring timer:", error);
      res.status(500).json({ message: "Failed to restore timer" });
    }
  });
  
  // Clear all archived timers for the user
  router.delete("/timers/archived", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const count = await storage.clearAllArchivedTimersByUserId(userId);
      res.json({ message: `${count} archived timers deleted successfully` });
    } catch (error) {
      console.error("Error clearing archived timers:", error);
      res.status(500).json({ message: "Failed to clear archived timers" });
    }
  });
  
  // Delete timer (permanent deletion - keeping for backward compatibility)
  router.delete("/timers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid timer ID" });
      }

      // First check if the timer exists and belongs to the authenticated user
      const existingTimer = await storage.getTimer(id);
      if (!existingTimer) {
        return res.status(404).json({ message: "Timer not found" });
      }
      
      // Verify ownership
      if (existingTimer.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to delete this timer" });
      }

      const success = await storage.deleteTimer(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting timer:", error);
      res.status(500).json({ message: "Failed to delete timer" });
    }
  });

  // Record timer press
  router.post("/timers/:id/press", requireAuth, async (req: Request, res: Response) => {
    try {
      const timerId = parseInt(req.params.id);
      if (isNaN(timerId)) {
        return res.status(400).json({ message: "Invalid timer ID" });
      }

      const timer = await storage.getTimer(timerId);
      if (!timer) {
        return res.status(404).json({ message: "Timer not found" });
      }

      // Verify ownership
      if (timer.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to press this timer" });
      }

      // Create history record
      const history = await storage.createTimerHistory({ 
        timerId,
        isActive: true
      });
      
      // Get updated enhanced timer for this user
      const enhancedTimers = await storage.getEnhancedTimersByUserId(req.user!.id);
      const updatedTimer = enhancedTimers.find(t => t.id === timerId);
      
      res.status(201).json({ history, timer: updatedTimer });
    } catch (error) {
      console.error("Error recording timer press:", error);
      res.status(500).json({ message: "Failed to record timer press" });
    }
  });

  // Undo/redo timer press (toggle isActive)
  router.patch("/history/:id", requireAuth, async (req: Request, res: Response) => {
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
      
      // First get the history record to check timer ownership
      const [historyRecord] = await db.select()
        .from(timerHistory)
        .where(eq(timerHistory.id, id))
        .limit(1);
        
      if (!historyRecord) {
        return res.status(404).json({ message: "History record not found" });
      }
      
      // Get the timer to check ownership
      const timer = await storage.getTimer(historyRecord.timerId);
      if (!timer) {
        return res.status(404).json({ message: "Associated timer not found" });
      }
      
      // Verify ownership
      if (timer.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to update this history" });
      }
      
      const updatedHistory = await storage.updateTimerHistory(id, validatedData.data.isActive);
      
      // Get enhanced timers for this user to return with updated state
      const enhancedTimers = await storage.getEnhancedTimersByUserId(req.user!.id);
      
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
  router.get("/timers/:id/history", requireAuth, async (req: Request, res: Response) => {
    try {
      const timerId = parseInt(req.params.id);
      if (isNaN(timerId)) {
        return res.status(400).json({ message: "Invalid timer ID" });
      }

      // First check if the timer exists and belongs to the authenticated user
      const timer = await storage.getTimer(timerId);
      if (!timer) {
        return res.status(404).json({ message: "Timer not found" });
      }
      
      // Verify ownership
      if (timer.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to access this timer's history" });
      }

      const history = await storage.getTimerHistory(timerId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching timer history:", error);
      res.status(500).json({ message: "Failed to fetch timer history" });
    }
  });

  // Get timer history by date range
  router.get("/history", requireAuth, async (req: Request, res: Response) => {
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
      
      // Need to modify this to filter by user ID
      const history = await storage.getTimerHistoryByDateRange(startDate, endDate);
      
      // Get all user's timers to filter history by
      const userTimers = await storage.getTimersByUserId(req.user!.id);
      const userTimerIds = userTimers.map(timer => timer.id);
      
      // Filter history to only include entries for the user's timers
      const filteredHistory = history.filter(entry => userTimerIds.includes(entry.timerId));
      
      res.json(filteredHistory);
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
