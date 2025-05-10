import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { generateVerificationToken, sendVerificationEmail } from "./email";

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
  
  // Configure session middleware with proper settings
  app.use(
    session({
      secret: SESSION_SECRET,
      resave: true, // Changed to true for better compatibility
      saveUninitialized: true, // Changed to true to ensure session is always created
      cookie: {
        secure: false, // Set to false to ensure cookies work in all environments
        // Cookie expiration will be set dynamically based on stayLoggedIn parameter
        maxAge: 1000 * 60 * 60 * 24 * 30, // Default to 30 days for better persistence
        sameSite: 'lax' // Add sameSite for better security
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
        
        // Explicitly save the session to ensure it's stored before sending response
        req.session.save((err) => {
          if (err) return next(err);
          
          // Log session info for debugging
          console.log("Session saved after registration. Session ID:", req.sessionID);
          
          // Return user without password
          const { password, ...userWithoutPassword } = user;
          res.status(201).json(userWithoutPassword);
        });
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
          
          // Explicitly save the session to ensure it's stored before sending response
          req.session.save((err) => {
            if (err) return next(err);
            
            // Log session info for debugging
            console.log("Session saved after login. Session ID:", req.sessionID);
            
            // Return user without password
            const { password, ...userWithoutPassword } = user as SelectUser;
            res.json(userWithoutPassword);
          });
        });
      }
    )(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req: Request, res: Response, next: NextFunction) => {
    // Log the session being destroyed
    console.log("Logging out session ID:", req.sessionID);
    
    req.logout((err) => {
      if (err) return next(err);
      
      // Destroy the session completely
      req.session.destroy((err) => {
        if (err) return next(err);
        // Clear the session cookie
        res.clearCookie('connect.sid');
        res.sendStatus(200);
      });
    });
  });

  // Get current user route
  app.get("/api/user", (req: Request, res: Response) => {
    // Log session information for debugging
    console.log("Session check - Session ID:", req.sessionID);
    console.log("User authenticated:", req.isAuthenticated());
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Log successful authentication
    console.log("Authenticated user:", req.user?.username);
    
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

      const { securityQuestion, securityAnswer, recoveryPin, emailVerified } = req.body;
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
      const userUpdateData: any = {
        securityQuestion,
        securityAnswer,
        recoveryPin
      };
      
      // Optionally mark email as verified (for "Just Trust Me" option)
      if (emailVerified === true) {
        userUpdateData.emailVerified = true;
        console.log("Setting emailVerified to true via 'Just Trust Me' option");
      }

      const updatedUser = await storage.updateUser(req.user.id, userUpdateData);

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
  
  // Add email to account and send verification email
  app.post("/api/user/email", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if email is already in use by another user
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({ message: "Email is already in use" });
      }

      // Generate verification token
      const verificationToken = generateVerificationToken();

      // Update user with email and verification token
      const updatedUser = await storage.updateUserEmail(req.user.id, email, verificationToken);

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update email" });
      }

      // Try to send verification email
      const emailSent = await sendVerificationEmail(email, updatedUser.username, verificationToken);

      if (!emailSent) {
        console.error("Error sending verification email");
        // We still return success even if email sending fails
        // The user can verify using the direct verification link
      }
      
      // Include verification token in the response during development
      // In production, this should be removed
      console.log(`Generated verification token: ${verificationToken.substring(0, 10)}...`);
      console.log(`Full verification URL: ${process.env.APP_URL || 'http://localhost:5000'}/api/verify-email?token=${verificationToken}`);

      // Return the updated user without sensitive information
      const { password, securityAnswer, recoveryPin, verificationToken: token, ...userWithoutSensitiveInfo } = updatedUser;
      res.json(userWithoutSensitiveInfo);
    } catch (error) {
      console.error("Email update error:", error);
      res.status(500).json({ message: "Email update failed" });
    }
  });

  // Verify email with token
  app.get("/api/verify-email", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        console.error("Missing verification token");
        return res.status(400).json({ message: "Verification token is required" });
      }

      console.log(`Processing verification token: ${token.substring(0, 10)}...`);
      
      const user = await storage.getUserByVerificationToken(token);
      
      if (!user) {
        console.error(`No user found with verification token starting with: ${token.substring(0, 10)}...`);
        return res.status(404).json({ message: "Invalid or expired verification token" });
      }

      console.log(`Found user: ${user.username} with ID: ${user.id}`);
      
      // Mark the email as verified
      const updatedUser = await storage.verifyUserEmail(user.id);

      if (!updatedUser) {
        console.error(`Failed to verify email for user ID: ${user.id}`);
        return res.status(500).json({ message: "Failed to verify email" });
      }

      console.log(`Successfully verified email for user: ${updatedUser.username}`);

      // For browser clients, send a proper HTML response
      const acceptHeader = req.headers.accept || '';
      if (acceptHeader.includes('text/html')) {
        // Return a nice HTML page with a redirect after a short delay
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Email Verified Successfully</title>
            <meta http-equiv="refresh" content="3;url=/" />
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background-color: #f7f7f7;
                color: #333;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                padding: 20px;
                text-align: center;
              }
              .card {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                padding: 30px;
                max-width: 500px;
                width: 100%;
              }
              h1 {
                color: #4CAF50;
                margin-top: 0;
              }
              .success-icon {
                font-size: 64px;
                color: #4CAF50;
                margin-bottom: 20px;
              }
              p {
                margin: 10px 0;
                line-height: 1.5;
              }
              .redirect-text {
                font-size: 14px;
                color: #666;
                margin-top: 20px;
              }
              .manual-link {
                display: inline-block;
                margin-top: 15px;
                color: #2196F3;
                text-decoration: none;
              }
              .manual-link:hover {
                text-decoration: underline;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="success-icon">✓</div>
              <h1>Email Verified Successfully</h1>
              <p>Thank you for verifying your email address!</p>
              <p>Your account is now fully activated and you have access to all features.</p>
              <p class="redirect-text">You will be redirected to the homepage in a few seconds...</p>
              <a href="/" class="manual-link">Click here if you're not redirected automatically</a>
            </div>
          </body>
          </html>
        `);
      }
      
      // Return JSON for API clients
      res.json({ 
        success: true, 
        message: "Email verified successfully",
        username: updatedUser.username 
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Email verification failed" });
    }
  });

  // Request new verification email
  app.post("/api/resend-verification", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = req.user as SelectUser;
      
      if (!user.email) {
        return res.status(400).json({ message: "No email address associated with this account" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      // Generate a new verification token
      const verificationToken = generateVerificationToken();

      // Update user with new verification token
      const updatedUser = await storage.updateUser(user.id, {
        verificationToken
      });

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update verification token" });
      }

      // Try to send verification email
      const emailSent = await sendVerificationEmail(user.email, user.username, verificationToken);

      // Always log the verification URL for development purposes
      console.log(`Generated verification token for resend: ${verificationToken.substring(0, 10)}...`);
      console.log(`Full verification URL: ${process.env.APP_URL || 'http://localhost:5000'}/api/verify-email?token=${verificationToken}`);

      // Don't fail the operation even if email sending failed
      // User can use the direct verification link from the logs or the debug endpoint

      res.json({ 
        success: true, 
        message: "Verification email sent" 
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });

  // Set or update day start hour preference
  app.post("/api/user/day-start-hour", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { dayStartHour } = req.body;
      if (dayStartHour === undefined || dayStartHour < 0 || dayStartHour > 23) {
        return res.status(400).json({ message: "Day start hour must be between 0 and 23" });
      }

      // Update the user's day start hour preference
      const updatedUser = await storage.updateUser(req.user.id, {
        dayStartHour
      });

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update day start hour" });
      }

      // Return the updated user without sensitive information
      const { password, securityAnswer, recoveryPin, ...userWithoutSensitiveInfo } = updatedUser;
      res.json(userWithoutSensitiveInfo);
    } catch (error) {
      console.error("Day start hour update error:", error);
      res.status(500).json({ message: "Day start hour update failed" });
    }
  });

  // Debug endpoint to check session status
  app.get("/api/debug/session", (req: Request, res: Response) => {
    console.log("Debug session info:");
    console.log("Session ID:", req.sessionID);
    console.log("Is authenticated:", req.isAuthenticated());
    console.log("Session data:", req.session);
    
    res.json({
      sessionId: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      user: req.isAuthenticated() ? req.user?.username : null,
      hasCookie: !!req.headers.cookie
    });
  });

  // Debug endpoint to test email sending
  app.get("/api/debug/test-email", async (req: Request, res: Response) => {
    try {
      const { email } = req.query;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email parameter is required" });
      }

      const testToken = generateVerificationToken();
      console.log(`Testing email verification with token: ${testToken.substring(0, 10)}...`);
      
      const sent = await sendVerificationEmail(email, "TestUser", testToken);
      
      if (sent) {
        res.json({ 
          success: true, 
          message: "Test verification email sent successfully",
          email
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to send test verification email" 
        });
      }
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error sending test email",
        error: (error as Error).message
      });
    }
  });
  
  // For testing purposes only - get the verification token for a user
  // This should be removed in production
  app.get("/api/debug/get-token", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      // Generate a new token if there isn't one
      let token = user.verificationToken;
      let updatedUser = user;
      
      if (!token) {
        token = generateVerificationToken();
        const result = await storage.updateUser(req.user.id, { verificationToken: token });
        if (!result) {
          return res.status(500).json({ success: false, message: "Failed to generate verification token" });
        }
        updatedUser = result;
        console.log(`Generated new verification token for user ${user.username}: ${token.substring(0, 8)}...`);
      }
      
      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const verificationUrl = `${appUrl}/api/verify-email?token=${token}`;
      
      console.log(`Verification URL for ${user.username}: ${verificationUrl}`);
      
      res.json({ 
        success: true, 
        token: token,
        verificationUrl: verificationUrl
      });
    } catch (error) {
      console.error("Error getting verification token:", error);
      res.status(500).json({ success: false, message: "Failed to get verification token" });
    }
  });
}