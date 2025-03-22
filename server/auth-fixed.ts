import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Helper function to hash passwords securely
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Helper function to compare passwords securely
async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Set up authentication middleware and routes
export function setupAuth(app: Express) {
  // Generate a random session secret if not provided in environment
  const SESSION_SECRET = process.env.SESSION_SECRET || randomBytes(32).toString("hex");
  
  // Configure session middleware
  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        // Cookie expiration will be set dynamically based on stayLoggedIn parameter
        maxAge: 1000 * 60 * 60 * 24, // Default to 1 day
      },
      store: storage.sessionStore,
    })
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure the local strategy for Passport
  passport.use(
    new LocalStrategy(async (username: string, password: string, done: any) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Incorrect username or password" });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  // Serialize user to the session
  passport.serializeUser((user: Express.User, done: any) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done: any) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register route - create a new user
  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create new user with hashed password
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Log the user in automatically after registration
      req.login(user, (err) => {
        if (err) return next(err);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login route
  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      "local", 
      (err: any, user: Express.User | false, info: { message?: string }) => {
        if (err) return next(err);
        if (!user) {
          return res.status(401).json({ message: info?.message || "Authentication failed" });
        }
        
        // Handle the "Stay logged in" option
        if (req.body.stayLoggedIn) {
          // Set the session to last for 30 days
          if (req.session.cookie) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
          }
        }
        
        req.login(user, (err) => {
          if (err) return next(err);
          // Return user without password
          const { password, ...userWithoutPassword } = user as SelectUser;
          res.json(userWithoutPassword);
        });
      }
    )(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user route
  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    // Return user without password
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });

  // Authentication middleware for protecting routes
  app.use("/api/timers", (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() && req.method !== "GET") {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  });

  // Password recovery - check username and security question
  app.post("/api/recovery/check", async (req: Request, res: Response) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return the security question if set, without revealing answer
      if (!user.securityQuestion) {
        return res.status(400).json({ message: "No security question set for this user" });
      }

      res.json({ 
        securityQuestion: user.securityQuestion,
        username: user.username
      });
    } catch (error) {
      console.error("Recovery check error:", error);
      res.status(500).json({ message: "Recovery check failed" });
    }
  });

  // Password recovery - verify security answer
  app.post("/api/recovery/verify", async (req: Request, res: Response) => {
    try {
      const { username, securityAnswer } = req.body;
      if (!username || !securityAnswer) {
        return res.status(400).json({ message: "Username and security answer are required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if security answer matches
      if (user.securityAnswer?.toLowerCase() !== securityAnswer.toLowerCase()) {
        return res.status(401).json({ message: "Security answer is incorrect" });
      }

      // Return success if answer is correct
      res.json({ 
        success: true, 
        username: user.username,
        recoveryPinExists: !!user.recoveryPin
      });
    } catch (error) {
      console.error("Recovery verification error:", error);
      res.status(500).json({ message: "Recovery verification failed" });
    }
  });

  // Password recovery - verify PIN and reset password
  app.post("/api/recovery/reset", async (req: Request, res: Response) => {
    try {
      const { username, recoveryPin, newPassword } = req.body;
      if (!username || !recoveryPin || !newPassword) {
        return res.status(400).json({ 
          message: "Username, recovery PIN, and new password are required" 
        });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if recovery PIN matches
      if (user.recoveryPin !== recoveryPin) {
        return res.status(401).json({ message: "Recovery PIN is incorrect" });
      }

      // Update user's password
      const hashedPassword = await hashPassword(newPassword);
      const updatedUser = await storage.updateUser(user.id, { password: hashedPassword });

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      res.json({ success: true, message: "Password reset successful" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Password reset failed" });
    }
  });

  // Set or update security question, answer, and recovery PIN
  app.post("/api/user/security", async (req: Request, res: Response) => {
    try {
      // This route requires authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { securityQuestion, securityAnswer, recoveryPin } = req.body;
      if (!securityQuestion || !securityAnswer || !recoveryPin) {
        return res.status(400).json({
          message: "Security question, answer, and recovery PIN are required"
        });
      }

      // Validate PIN (4 digits)
      if (!/^\d{4}$/.test(recoveryPin)) {
        return res.status(400).json({ message: "Recovery PIN must be 4 digits" });
      }

      // Update the user's security info
      const updatedUser = await storage.updateUser(req.user.id, {
        securityQuestion,
        securityAnswer,
        recoveryPin
      });

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update security information" });
      }

      // Return the updated user without sensitive information
      const { password, securityAnswer: answer, recoveryPin: pin, ...userWithoutSensitiveInfo } = updatedUser;
      res.json(userWithoutSensitiveInfo);
    } catch (error) {
      console.error("Security update error:", error);
      res.status(500).json({ message: "Security update failed" });
    }
  });
}