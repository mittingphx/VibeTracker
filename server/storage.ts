import { 
  users, type User, type InsertUser,
  timers, type Timer, type InsertTimer,
  timerHistory, type TimerHistory, type InsertTimerHistory,
  type EnhancedTimer
} from "@shared/schema";
import { db } from "./db";
import { pool } from "./db";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<Omit<User, 'id'>>): Promise<User | undefined>;
  updateUserEmail(id: number, email: string, verificationToken: string): Promise<User | undefined>;
  verifyUserEmail(id: number): Promise<User | undefined>;

  // Timer operations
  getTimers(includeArchived?: boolean): Promise<Timer[]>;
  getTimersByUserId(userId: number, includeArchived?: boolean): Promise<Timer[]>;
  getArchivedTimers(): Promise<Timer[]>;
  getArchivedTimersByUserId(userId: number): Promise<Timer[]>;
  getTimer(id: number): Promise<Timer | undefined>;
  createTimer(timer: InsertTimer): Promise<Timer>;
  updateTimer(id: number, timer: Partial<InsertTimer>): Promise<Timer | undefined>;
  deleteTimer(id: number): Promise<boolean>;
  archiveTimer(id: number): Promise<Timer | undefined>;
  restoreTimer(id: number): Promise<Timer | undefined>;
  clearAllArchivedTimers(): Promise<number>; // Returns number of deleted timers
  clearAllArchivedTimersByUserId(userId: number): Promise<number>; // Returns number of deleted timers for a user
  
  // Timer history operations
  getTimerHistory(timerId: number): Promise<TimerHistory[]>;
  getAllTimerHistory(): Promise<TimerHistory[]>;
  getTimerHistoryById(id: number): Promise<TimerHistory | undefined>;
  createTimerHistory(history: InsertTimerHistory): Promise<TimerHistory>;
  updateTimerHistory(id: number, isActive: boolean): Promise<TimerHistory | undefined>;
  updateTimerHistoryTimestamp(id: number, timestamp: Date): Promise<TimerHistory | undefined>;
  updateTimerHistoryFull(id: number, data: { timestamp?: Date; isActive?: boolean }): Promise<TimerHistory | undefined>;
  deleteTimerHistory(id: number): Promise<boolean>;
  
  // Enhanced operations
  getEnhancedTimers(includeArchived?: boolean): Promise<EnhancedTimer[]>;
  getEnhancedTimersByUserId(userId: number, includeArchived?: boolean): Promise<EnhancedTimer[]>;
  getTimerHistoryByDateRange(startDate: Date, endDate: Date): Promise<TimerHistory[]>;
  
  // Database operations
  initializeDatabase(): Promise<void>;
  
  // Session store for authentication
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private timersMap: Map<number, Timer>;
  private timerHistoryMap: Map<number, TimerHistory>;
  private userId: number;
  private timerId: number;
  private historyId: number;
  private initialized: boolean;
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.timersMap = new Map();
    this.timerHistoryMap = new Map();
    this.userId = 1;
    this.timerId = 1;
    this.historyId = 1;
    this.initialized = false;
    
    // Create memory store for sessions
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Initialize data asynchronously
    this.initializeData();
  }
  
  private async initializeData() {
    if (this.initialized) return;
    this.initialized = true;
    // No demo data will be created
    console.log("Initialized in-memory storage without demo data");
  }

  async initializeDatabase(): Promise<void> {
    await this.initializeData();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }
  
  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.verificationToken === token,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { 
      ...insertUser, 
      id,
      securityQuestion: insertUser.securityQuestion || null,
      securityAnswer: insertUser.securityAnswer || null,
      recoveryPin: insertUser.recoveryPin || null,
      email: insertUser.email || null,
      emailVerified: false,
      verificationToken: null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUserEmail(id: number, email: string, verificationToken: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      email,
      verificationToken,
      emailVerified: false
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async verifyUserEmail(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      emailVerified: true,
      verificationToken: null
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUser(id: number, userData: Partial<Omit<User, 'id'>>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      ...userData
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Timer operations
  async getTimers(includeArchived: boolean = false): Promise<Timer[]> {
    if (includeArchived) {
      return Array.from(this.timersMap.values());
    } else {
      return Array.from(this.timersMap.values())
        .filter(timer => !timer.isArchived);
    }
  }

  async getTimersByUserId(userId: number, includeArchived: boolean = false): Promise<Timer[]> {
    if (includeArchived) {
      return Array.from(this.timersMap.values())
        .filter(timer => timer.userId === userId);
    } else {
      return Array.from(this.timersMap.values())
        .filter(timer => !timer.isArchived && timer.userId === userId);
    }
  }

  async getArchivedTimers(): Promise<Timer[]> {
    return Array.from(this.timersMap.values())
      .filter(timer => timer.isArchived);
  }

  async getArchivedTimersByUserId(userId: number): Promise<Timer[]> {
    return Array.from(this.timersMap.values())
      .filter(timer => timer.isArchived && timer.userId === userId);
  }
  
  async clearAllArchivedTimersByUserId(userId: number): Promise<number> {
    const archivedIds = Array.from(this.timersMap.entries())
      .filter(([_, timer]) => timer.isArchived && timer.userId === userId)
      .map(([id, _]) => id);
    
    for (const id of archivedIds) {
      this.timersMap.delete(id);
    }
    
    return archivedIds.length;
  }

  async getTimer(id: number): Promise<Timer | undefined> {
    return this.timersMap.get(id);
  }
  
  async archiveTimer(id: number): Promise<Timer | undefined> {
    const timer = this.timersMap.get(id);
    if (!timer) return undefined;
    
    const updatedTimer: Timer = {
      ...timer,
      isArchived: true
    };
    
    this.timersMap.set(id, updatedTimer);
    return updatedTimer;
  }
  
  async restoreTimer(id: number): Promise<Timer | undefined> {
    const timer = this.timersMap.get(id);
    if (!timer) return undefined;
    
    const updatedTimer: Timer = {
      ...timer,
      isArchived: false
    };
    
    this.timersMap.set(id, updatedTimer);
    return updatedTimer;
  }
  
  async clearAllArchivedTimers(): Promise<number> {
    const archivedIds = Array.from(this.timersMap.entries())
      .filter(([_, timer]) => timer.isArchived)
      .map(([id, _]) => id);
    
    for (const id of archivedIds) {
      this.timersMap.delete(id);
    }
    
    return archivedIds.length;
  }

  async createTimer(insertTimer: InsertTimer): Promise<Timer> {
    const id = this.timerId++;
    const now = new Date();
    const timer: Timer = { 
      id,
      userId: insertTimer.userId,
      category: insertTimer.category ?? null,
      label: insertTimer.label,
      minTime: insertTimer.minTime ?? 0,
      maxTime: insertTimer.maxTime ?? null,
      isEnabled: insertTimer.isEnabled ?? true,
      playSound: insertTimer.playSound ?? true,
      color: insertTimer.color ?? "#007AFF",
      displayType: insertTimer.displayType ?? "bar",
      createdAt: now,
      isArchived: insertTimer.isArchived ?? false
    };
    this.timersMap.set(id, timer);
    return timer;
  }

  async updateTimer(id: number, timerUpdate: Partial<InsertTimer>): Promise<Timer | undefined> {
    const timer = this.timersMap.get(id);
    if (!timer) return undefined;
    
    const updatedTimer: Timer = {
      ...timer,
      ...timerUpdate
    };
    
    this.timersMap.set(id, updatedTimer);
    return updatedTimer;
  }

  async deleteTimer(id: number): Promise<boolean> {
    return this.timersMap.delete(id);
  }

  // Timer history operations
  async getTimerHistory(timerId: number): Promise<TimerHistory[]> {
    return Array.from(this.timerHistoryMap.values())
      .filter(history => history.timerId === timerId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getAllTimerHistory(): Promise<TimerHistory[]> {
    return Array.from(this.timerHistoryMap.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createTimerHistory(insertHistory: InsertTimerHistory): Promise<TimerHistory> {
    const id = this.historyId++;
    const timestamp = insertHistory.timestamp || new Date();
    const history: TimerHistory = {
      id,
      timerId: insertHistory.timerId,
      isActive: insertHistory.isActive ?? true,
      timestamp
    };
    this.timerHistoryMap.set(id, history);
    return history;
  }

  async updateTimerHistory(id: number, isActive: boolean): Promise<TimerHistory | undefined> {
    const history = this.timerHistoryMap.get(id);
    if (!history) return undefined;
    
    const updatedHistory: TimerHistory = {
      ...history,
      isActive
    };
    
    this.timerHistoryMap.set(id, updatedHistory);
    return updatedHistory;
  }
  
  async updateTimerHistoryTimestamp(id: number, timestamp: Date): Promise<TimerHistory | undefined> {
    const history = this.timerHistoryMap.get(id);
    if (!history) return undefined;
    
    const updatedHistory: TimerHistory = {
      ...history,
      timestamp
    };
    
    this.timerHistoryMap.set(id, updatedHistory);
    return updatedHistory;
  }
  
  async updateTimerHistoryFull(id: number, data: { timestamp?: Date; isActive?: boolean }): Promise<TimerHistory | undefined> {
    const history = this.timerHistoryMap.get(id);
    if (!history) return undefined;
    
    const updatedHistory: TimerHistory = {
      ...history,
      ...(data.timestamp ? { timestamp: data.timestamp } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {})
    };
    
    this.timerHistoryMap.set(id, updatedHistory);
    return updatedHistory;
  }
  
  async getTimerHistoryById(id: number): Promise<TimerHistory | undefined> {
    return this.timerHistoryMap.get(id);
  }
  
  async deleteTimerHistory(id: number): Promise<boolean> {
    return this.timerHistoryMap.delete(id);
  }
  
  async getEnhancedTimersByUserId(userId: number, includeArchived: boolean = false): Promise<EnhancedTimer[]> {
    const timers = await this.getTimersByUserId(userId, includeArchived);
    const enhancedTimers: EnhancedTimer[] = [];
    
    for (const timer of timers) {
      const history = await this.getTimerHistory(timer.id);
      const activeHistory = history.filter(h => h.isActive);
      
      const lastPressed = activeHistory.length > 0 ? activeHistory[0].timestamp : null;
      const now = new Date();
      
      // Calculate elapsed time in seconds
      const elapsedTime = lastPressed 
        ? Math.max(0, Math.floor((now.getTime() - lastPressed.getTime()) / 1000))
        : 0;
      
      // Calculate progress between min and max time (0-100%)
      let progress = 0;
      if (timer.maxTime && timer.minTime < timer.maxTime) {
        if (elapsedTime <= timer.minTime) {
          progress = (elapsedTime / timer.minTime) * 50; // 0-50% for min time
        } else if (elapsedTime >= timer.maxTime) {
          progress = 100;
        } else {
          // 50-100% for between min and max time
          progress = 50 + ((elapsedTime - timer.minTime) / (timer.maxTime - timer.minTime) * 50);
        }
      } else if (timer.minTime > 0) {
        // If no max time, base progress on min time
        progress = Math.min(100, (elapsedTime / timer.minTime) * 100);
      }
      
      // Check if we can press the button (min time passed)
      const canPress = elapsedTime >= timer.minTime;
      
      enhancedTimers.push({
        ...timer,
        lastPressed,
        elapsedTime,
        progress,
        canPress
      });
    }
    
    return enhancedTimers;
  }

  // Enhanced operations
  async getEnhancedTimers(includeArchived: boolean = false): Promise<EnhancedTimer[]> {
    const timers = await this.getTimers(includeArchived);
    const enhancedTimers: EnhancedTimer[] = [];
    
    for (const timer of timers) {
      const history = await this.getTimerHistory(timer.id);
      const activeHistory = history.filter(h => h.isActive);
      
      const lastPressed = activeHistory.length > 0 ? activeHistory[0].timestamp : null;
      const now = new Date();
      
      // Calculate elapsed time in seconds
      const elapsedTime = lastPressed 
        ? Math.max(0, Math.floor((now.getTime() - lastPressed.getTime()) / 1000))
        : 0;
      
      // Calculate progress between min and max time (0-100%)
      let progress = 0;
      if (timer.maxTime && timer.minTime < timer.maxTime) {
        if (elapsedTime <= timer.minTime) {
          progress = (elapsedTime / timer.minTime) * 50; // 0-50% for min time
        } else if (elapsedTime >= timer.maxTime) {
          progress = 100;
        } else {
          // 50-100% for between min and max time
          progress = 50 + ((elapsedTime - timer.minTime) / (timer.maxTime - timer.minTime) * 50);
        }
      } else if (timer.minTime > 0) {
        // If no max time, base progress on min time
        progress = Math.min(100, (elapsedTime / timer.minTime) * 100);
      }
      
      // Check if we can press the button (min time passed)
      const canPress = elapsedTime >= timer.minTime;
      
      enhancedTimers.push({
        ...timer,
        lastPressed,
        elapsedTime,
        progress,
        canPress
      });
    }
    
    return enhancedTimers;
  }

  async getTimerHistoryByDateRange(startDate: Date, endDate: Date): Promise<TimerHistory[]> {
    return Array.from(this.timerHistoryMap.values())
      .filter(history => {
        return history.timestamp >= startDate && history.timestamp <= endDate && history.isActive;
      })
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}

export class DatabaseStorage implements IStorage {
  private initialized: boolean = false;
  public sessionStore: session.Store;

  constructor() {
    // We'll initialize database in a separate method
    this.initialized = false;

    // Create PostgreSQL session store
    const PgStore = connectPgSimple(session);
    this.sessionStore = new PgStore({
      pool,
      createTableIfMissing: true
    });
  }

  async initializeDatabase(): Promise<void> {
    if (this.initialized) return;
    
    // Just initialize without adding any sample data
    console.log("Initializing database without demo data");
    
    // Set initialized flag to true
    this.initialized = true;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.verificationToken, token));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateUserEmail(id: number, email: string, verificationToken: string): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({ 
        email, 
        verificationToken, 
        emailVerified: false 
      })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }
  
  async verifyUserEmail(id: number): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({ 
        emailVerified: true,
        verificationToken: null 
      })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async updateUser(id: number, userData: Partial<Omit<User, 'id'>>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  // Timer operations
  async getTimers(includeArchived: boolean = false): Promise<Timer[]> {
    if (includeArchived) {
      return db.select().from(timers);
    } else {
      return db.select()
        .from(timers)
        .where(eq(timers.isArchived, false));
    }
  }

  async getTimersByUserId(userId: number, includeArchived: boolean = false): Promise<Timer[]> {
    if (includeArchived) {
      return db.select()
        .from(timers)
        .where(eq(timers.userId, userId));
    } else {
      return db.select()
        .from(timers)
        .where(
          and(
            eq(timers.isArchived, false),
            eq(timers.userId, userId)
          )
        );
    }
  }
  
  async getArchivedTimers(): Promise<Timer[]> {
    return db.select()
      .from(timers)
      .where(eq(timers.isArchived, true));
  }

  async getArchivedTimersByUserId(userId: number): Promise<Timer[]> {
    return db.select()
      .from(timers)
      .where(
        and(
          eq(timers.isArchived, true),
          eq(timers.userId, userId)
        )
      );
  }

  async getTimer(id: number): Promise<Timer | undefined> {
    const [timer] = await db.select().from(timers).where(eq(timers.id, id));
    return timer;
  }
  
  async archiveTimer(id: number): Promise<Timer | undefined> {
    const [updatedTimer] = await db.update(timers)
      .set({ isArchived: true })
      .where(eq(timers.id, id))
      .returning();
    
    return updatedTimer;
  }
  
  async restoreTimer(id: number): Promise<Timer | undefined> {
    const [updatedTimer] = await db.update(timers)
      .set({ isArchived: false })
      .where(eq(timers.id, id))
      .returning();
    
    return updatedTimer;
  }
  
  async clearAllArchivedTimers(): Promise<number> {
    const result = await db.delete(timers)
      .where(eq(timers.isArchived, true))
      .returning();
    
    return result.length;
  }
  
  async clearAllArchivedTimersByUserId(userId: number): Promise<number> {
    const result = await db.delete(timers)
      .where(
        and(
          eq(timers.isArchived, true),
          eq(timers.userId, userId)
        )
      )
      .returning();
    
    return result.length;
  }

  async createTimer(insertTimer: InsertTimer): Promise<Timer> {
    const [timer] = await db.insert(timers).values(insertTimer).returning();
    return timer;
  }

  async updateTimer(id: number, timerUpdate: Partial<InsertTimer>): Promise<Timer | undefined> {
    const [updatedTimer] = await db.update(timers)
      .set(timerUpdate)
      .where(eq(timers.id, id))
      .returning();
    
    return updatedTimer;
  }

  async deleteTimer(id: number): Promise<boolean> {
    const [deletedTimer] = await db.delete(timers)
      .where(eq(timers.id, id))
      .returning({ id: timers.id });
    
    return !!deletedTimer;
  }

  // Timer history operations
  async getTimerHistory(timerId: number): Promise<TimerHistory[]> {
    return db.select()
      .from(timerHistory)
      .where(eq(timerHistory.timerId, timerId))
      .orderBy(desc(timerHistory.timestamp));
  }

  async getAllTimerHistory(): Promise<TimerHistory[]> {
    return db.select()
      .from(timerHistory)
      .orderBy(desc(timerHistory.timestamp));
  }

  async createTimerHistory(insertHistory: InsertTimerHistory): Promise<TimerHistory> {
    const toInsert = {
      ...insertHistory,
      timestamp: insertHistory.timestamp || new Date()
    };
    
    const [history] = await db.insert(timerHistory)
      .values(toInsert)
      .returning();
    
    return history;
  }

  async getTimerHistoryById(id: number): Promise<TimerHistory | undefined> {
    const [history] = await db.select()
      .from(timerHistory)
      .where(eq(timerHistory.id, id));
    
    return history;
  }

  async updateTimerHistory(id: number, isActive: boolean): Promise<TimerHistory | undefined> {
    const [updatedHistory] = await db.update(timerHistory)
      .set({ isActive })
      .where(eq(timerHistory.id, id))
      .returning();
    
    return updatedHistory;
  }
  
  async updateTimerHistoryTimestamp(id: number, timestamp: Date): Promise<TimerHistory | undefined> {
    const [updatedHistory] = await db.update(timerHistory)
      .set({ timestamp })
      .where(eq(timerHistory.id, id))
      .returning();
    
    return updatedHistory;
  }
  
  async updateTimerHistoryFull(id: number, data: { timestamp?: Date; isActive?: boolean }): Promise<TimerHistory | undefined> {
    const [updatedHistory] = await db.update(timerHistory)
      .set(data)
      .where(eq(timerHistory.id, id))
      .returning();
    
    return updatedHistory;
  }
  
  async deleteTimerHistory(id: number): Promise<boolean> {
    const [deletedHistory] = await db.delete(timerHistory)
      .where(eq(timerHistory.id, id))
      .returning({ id: timerHistory.id });
    
    return !!deletedHistory;
  }

  // Enhanced operations
  async getEnhancedTimers(includeArchived: boolean = false): Promise<EnhancedTimer[]> {
    const allTimers = await this.getTimers(includeArchived);
    const enhancedTimers: EnhancedTimer[] = [];
    
    for (const timer of allTimers) {
      // Get the most recent active history entry for this timer
      const [lastHistory] = await db.select()
        .from(timerHistory)
        .where(
          and(
            eq(timerHistory.timerId, timer.id),
            eq(timerHistory.isActive, true)
          )
        )
        .orderBy(desc(timerHistory.timestamp))
        .limit(1);
      
      const lastPressed = lastHistory?.timestamp || null;
      const now = new Date();
      
      // Calculate elapsed time in seconds
      const elapsedTime = lastPressed 
        ? Math.max(0, Math.floor((now.getTime() - lastPressed.getTime()) / 1000))
        : 0;
      
      // Calculate progress between min and max time (0-100%)
      let progress = 0;
      if (timer.maxTime && timer.minTime < timer.maxTime) {
        if (elapsedTime <= timer.minTime) {
          progress = (elapsedTime / timer.minTime) * 50; // 0-50% for min time
        } else if (elapsedTime >= timer.maxTime) {
          progress = 100;
        } else {
          // 50-100% for between min and max time
          progress = 50 + ((elapsedTime - timer.minTime) / (timer.maxTime - timer.minTime) * 50);
        }
      } else if (timer.minTime > 0) {
        // If no max time, base progress on min time
        progress = Math.min(100, (elapsedTime / timer.minTime) * 100);
      }
      
      // Check if we can press the button (min time passed)
      const canPress = elapsedTime >= timer.minTime;
      
      enhancedTimers.push({
        ...timer,
        lastPressed,
        elapsedTime,
        progress,
        canPress
      });
    }
    
    return enhancedTimers;
  }
  
  async getEnhancedTimersByUserId(userId: number, includeArchived: boolean = false): Promise<EnhancedTimer[]> {
    const allTimers = await this.getTimersByUserId(userId, includeArchived);
    const enhancedTimers: EnhancedTimer[] = [];
    
    for (const timer of allTimers) {
      // Get the most recent active history entry for this timer
      const [lastHistory] = await db.select()
        .from(timerHistory)
        .where(
          and(
            eq(timerHistory.timerId, timer.id),
            eq(timerHistory.isActive, true)
          )
        )
        .orderBy(desc(timerHistory.timestamp))
        .limit(1);
      
      const lastPressed = lastHistory?.timestamp || null;
      const now = new Date();
      
      // Calculate elapsed time in seconds
      const elapsedTime = lastPressed 
        ? Math.max(0, Math.floor((now.getTime() - lastPressed.getTime()) / 1000))
        : 0;
      
      // Calculate progress between min and max time (0-100%)
      let progress = 0;
      if (timer.maxTime && timer.minTime < timer.maxTime) {
        if (elapsedTime <= timer.minTime) {
          progress = (elapsedTime / timer.minTime) * 50; // 0-50% for min time
        } else if (elapsedTime >= timer.maxTime) {
          progress = 100;
        } else {
          // 50-100% for between min and max time
          progress = 50 + ((elapsedTime - timer.minTime) / (timer.maxTime - timer.minTime) * 50);
        }
      } else if (timer.minTime > 0) {
        // If no max time, base progress on min time
        progress = Math.min(100, (elapsedTime / timer.minTime) * 100);
      }
      
      // Check if we can press the button (min time passed)
      const canPress = elapsedTime >= timer.minTime;
      
      enhancedTimers.push({
        ...timer,
        lastPressed,
        elapsedTime,
        progress,
        canPress
      });
    }
    
    return enhancedTimers;
  }

  async getTimerHistoryByDateRange(startDate: Date, endDate: Date): Promise<TimerHistory[]> {
    return db.select()
      .from(timerHistory)
      .where(
        and(
          gte(timerHistory.timestamp, startDate),
          lte(timerHistory.timestamp, endDate),
          eq(timerHistory.isActive, true)
        )
      )
      .orderBy(asc(timerHistory.timestamp));
  }
}

// Switch from MemStorage to DatabaseStorage
export const storage = new DatabaseStorage();
