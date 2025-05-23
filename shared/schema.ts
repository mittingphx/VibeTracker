import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table (keeping this for potential future user accounts)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: text("verification_token"),
  securityQuestion: text("security_question"),
  securityAnswer: text("security_answer"),
  recoveryPin: text("recovery_pin"),
  dayStartHour: integer("day_start_hour").default(0), // Hour (0-23) when a new day starts, default is midnight (0)
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  securityQuestion: true,
  securityAnswer: true,
  recoveryPin: true,
});

// Timer table for storing timer definitions
export const timers = pgTable("timers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Associate timer with a user
  label: text("label").notNull(),
  category: text("category").default("Default"), // Category for organization
  minTime: integer("min_time").notNull().default(0), // Min time in seconds
  maxTime: integer("max_time"), // Max time in seconds (optional)
  isEnabled: boolean("is_enabled").notNull().default(true),
  playSound: boolean("play_sound").notNull().default(true),
  color: text("color").notNull().default("#007AFF"), // iOS blue default
  displayType: text("display_type").notNull().default("bar"), // "bar" or "wheel"
  showTotalSeconds: boolean("show_total_seconds").notNull().default(false), // Whether to show total seconds count
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isArchived: boolean("is_archived").notNull().default(false), // Whether timer is archived
});

export const insertTimerSchema = createInsertSchema(timers).omit({
  id: true,
  createdAt: true,
});

// Timer history for tracking timer presses
export const timerHistory = pgTable("timer_history", {
  id: serial("id").primaryKey(),
  timerId: integer("timer_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true), // Used for undo/redo functionality
});

export const insertTimerHistorySchema = createInsertSchema(timerHistory).omit({
  id: true,
}).partial({
  timestamp: true,
});

// Exported types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Timer = typeof timers.$inferSelect;
export type InsertTimer = z.infer<typeof insertTimerSchema>;
export type TimerHistory = typeof timerHistory.$inferSelect;
export type InsertTimerHistory = z.infer<typeof insertTimerHistorySchema>;

// Enhanced timer type with calculated fields
export type EnhancedTimer = Timer & {
  lastPressed: Date | null;
  elapsedTime: number; // in seconds
  progress: number; // 0-100 percentage between min and max time
  canPress: boolean; // if min time has passed
};
