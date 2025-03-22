import { 
  users, type User, type InsertUser,
  timers, type Timer, type InsertTimer,
  timerHistory, type TimerHistory, type InsertTimerHistory,
  type EnhancedTimer
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Timer operations
  getTimers(): Promise<Timer[]>;
  getTimer(id: number): Promise<Timer | undefined>;
  createTimer(timer: InsertTimer): Promise<Timer>;
  updateTimer(id: number, timer: Partial<InsertTimer>): Promise<Timer | undefined>;
  deleteTimer(id: number): Promise<boolean>;
  
  // Timer history operations
  getTimerHistory(timerId: number): Promise<TimerHistory[]>;
  getAllTimerHistory(): Promise<TimerHistory[]>;
  createTimerHistory(history: InsertTimerHistory): Promise<TimerHistory>;
  updateTimerHistory(id: number, isActive: boolean): Promise<TimerHistory | undefined>;
  
  // Enhanced operations
  getEnhancedTimers(): Promise<EnhancedTimer[]>;
  getTimerHistoryByDateRange(startDate: Date, endDate: Date): Promise<TimerHistory[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private timersMap: Map<number, Timer>;
  private timerHistoryMap: Map<number, TimerHistory>;
  private userId: number;
  private timerId: number;
  private historyId: number;
  private initialized: boolean;

  constructor() {
    this.users = new Map();
    this.timersMap = new Map();
    this.timerHistoryMap = new Map();
    this.userId = 1;
    this.timerId = 1;
    this.historyId = 1;
    this.initialized = false;
    
    // Initialize data asynchronously
    this.initializeData();
  }
  
  private async initializeData() {
    if (this.initialized) return;
    this.initialized = true;
    // Create sample timers
    const timer1 = await this.createTimer({
      label: "Last Cigarette",
      minTime: 4 * 60 * 60, // 4 hours in seconds
      maxTime: 24 * 60 * 60, // 1 day in seconds
      isEnabled: true,
      playSound: true,
      color: "#007AFF" // iOS blue
    });
    
    const timer2 = await this.createTimer({
      label: "Fed Cat",
      minTime: 6 * 60 * 60, // 6 hours in seconds
      maxTime: 8 * 60 * 60, // 8 hours in seconds
      isEnabled: true,
      playSound: true,
      color: "#FF9500" // iOS orange
    });
    
    const timer3 = await this.createTimer({
      label: "Took Medication",
      minTime: 22 * 60 * 60, // 22 hours in seconds
      maxTime: 24 * 60 * 60, // 24 hours in seconds
      isEnabled: true,
      playSound: true,
      color: "#34C759" // iOS green
    });
    
    // Add sample history data for charts
    // Today's data
    const now = new Date();
    
    // Cigarette timer - entries for today
    await this.createTimerHistory({
      timerId: timer1.id,
      isActive: true,
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 30) // 7:30 AM today
    });
    
    await this.createTimerHistory({
      timerId: timer1.id,
      isActive: true,
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 15) // 12:15 PM today
    });
    
    await this.createTimerHistory({
      timerId: timer1.id,
      isActive: true,
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0) // 6:00 PM today
    });
    
    // Yesterday's data for comparison
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    await this.createTimerHistory({
      timerId: timer1.id,
      isActive: true,
      timestamp: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 8, 0) // 8:00 AM yesterday
    });
    
    await this.createTimerHistory({
      timerId: timer1.id,
      isActive: true,
      timestamp: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 13, 0) // 1:00 PM yesterday
    });
    
    await this.createTimerHistory({
      timerId: timer1.id,
      isActive: true,
      timestamp: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 17, 30) // 5:30 PM yesterday
    });
    
    await this.createTimerHistory({
      timerId: timer1.id,
      isActive: true,
      timestamp: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 22, 0) // 10:00 PM yesterday
    });
    
    // Add some data for the cat feeding timer too
    await this.createTimerHistory({
      timerId: timer2.id,
      isActive: true,
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0) // 6:00 AM today
    });
    
    await this.createTimerHistory({
      timerId: timer2.id,
      isActive: true,
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0) // 2:00 PM today
    });
    
    await this.createTimerHistory({
      timerId: timer2.id,
      isActive: true,
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0) // 8:00 PM today
    });
    
    // Medication timer - once per day
    await this.createTimerHistory({
      timerId: timer3.id,
      isActive: true,
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0) // 8:00 AM today
    });
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Timer operations
  async getTimers(): Promise<Timer[]> {
    return Array.from(this.timersMap.values());
  }

  async getTimer(id: number): Promise<Timer | undefined> {
    return this.timersMap.get(id);
  }

  async createTimer(insertTimer: InsertTimer): Promise<Timer> {
    const id = this.timerId++;
    const now = new Date();
    const timer: Timer = { 
      id,
      label: insertTimer.label,
      minTime: insertTimer.minTime ?? 0,
      maxTime: insertTimer.maxTime ?? null,
      isEnabled: insertTimer.isEnabled ?? true,
      playSound: insertTimer.playSound ?? true,
      color: insertTimer.color ?? "#007AFF",
      createdAt: now
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

  // Enhanced operations
  async getEnhancedTimers(): Promise<EnhancedTimer[]> {
    const timers = await this.getTimers();
    const enhancedTimers: EnhancedTimer[] = [];
    
    for (const timer of timers) {
      const history = await this.getTimerHistory(timer.id);
      const activeHistory = history.filter(h => h.isActive);
      
      const lastPressed = activeHistory.length > 0 ? activeHistory[0].timestamp : null;
      const now = new Date();
      
      // Calculate elapsed time in seconds
      const elapsedTime = lastPressed 
        ? Math.floor((now.getTime() - lastPressed.getTime()) / 1000) 
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

export const storage = new MemStorage();
