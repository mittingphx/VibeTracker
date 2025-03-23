import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  TimerOff,
  KeyRound,
  HelpCircle,
  ArrowLeft,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Create authentication schemas based on insert user schema
const loginSchema = insertUserSchema
  .pick({
    username: true,
    password: true,
  })
  .extend({
    stayLoggedIn: z.boolean().default(false),
  });

// Add password confirmation and security fields for registration
const registerSchema = insertUserSchema
  .pick({
    username: true,
    password: true,
  })
  .extend({
    confirmPassword: z.string().min(1, "Confirm password is required"),
    securityQuestion: z.string().min(3, "Security question is required"),
    securityAnswer: z.string().min(1, "Security answer is required"),
    recoveryPin: z
      .string()
      .length(4, "Recovery PIN must be 4 digits")
      .regex(/^\d+$/, "PIN must contain only digits"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");

  // Redirect to home if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  // Recovery states
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(1);
  const [recoveryUsername, setRecoveryUsername] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [recoveryPin, setRecoveryPin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { toast } = useToast();

  // Login form handling
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      stayLoggedIn: false,
    },
  });

  // Add loading state management
  useEffect(() => {
    if (loginMutation.isPending || registerMutation.isPending) {
      document.body.style.opacity = "0.7";
    } else {
      document.body.style.opacity = "1";
    }
    return () => {
      document.body.style.opacity = "1";
    };
  }, [loginMutation.isPending, registerMutation.isPending]);

  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  // Password recovery handlers
  const startRecovery = () => {
    setRecoveryMode(true);
    setRecoveryStep(1);
    setErrorMsg("");
  };

  const cancelRecovery = () => {
    setRecoveryMode(false);
    setRecoveryStep(1);
    setRecoveryUsername("");
    setSecurityQuestion("");
    setSecurityAnswer("");
    setRecoveryPin("");
    setNewPassword("");
    setConfirmNewPassword("");
    setErrorMsg("");
  };

  const checkUsername = async () => {
    if (!recoveryUsername) {
      setErrorMsg("Please enter your username");
      return;
    }

    setRecoveryLoading(true);
    setErrorMsg("");

    try {
      const response = await apiRequest("POST", "/api/recovery/check", {
        username: recoveryUsername,
      });

      if (response.ok) {
        const data = await response.json();
        setSecurityQuestion(data.securityQuestion);
        setRecoveryStep(2);
      } else {
        const error = await response.json();
        setErrorMsg(
          error.message || "User not found or no security question set",
        );
      }
    } catch (error) {
      setErrorMsg("An error occurred. Please try again.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  const verifySecurityAnswer = async () => {
    if (!securityAnswer) {
      setErrorMsg("Please enter your security answer");
      return;
    }

    setRecoveryLoading(true);
    setErrorMsg("");

    try {
      const response = await apiRequest("POST", "/api/recovery/verify", {
        username: recoveryUsername,
        securityAnswer: securityAnswer,
      });

      if (response.ok) {
        setRecoveryStep(3);
      } else {
        const error = await response.json();
        setErrorMsg(error.message || "Security answer is incorrect");
      }
    } catch (error) {
      setErrorMsg("An error occurred. Please try again.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!recoveryPin) {
      setErrorMsg("Please enter your recovery PIN");
      return;
    }

    if (!newPassword) {
      setErrorMsg("Please enter a new password");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    setRecoveryLoading(true);
    setErrorMsg("");

    try {
      const response = await apiRequest("POST", "/api/recovery/reset", {
        username: recoveryUsername,
        recoveryPin: recoveryPin,
        newPassword: newPassword,
      });

      if (response.ok) {
        toast({
          title: "Password reset successful",
          description: "You can now log in with your new password",
          variant: "default",
        });
        cancelRecovery();
      } else {
        const error = await response.json();
        setErrorMsg(error.message || "Failed to reset password");
      }
    } catch (error) {
      setErrorMsg("An error occurred. Please try again.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Register form handling
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      securityQuestion: "",
      securityAnswer: "",
      recoveryPin: "",
    },
  });

  const onRegisterSubmit = async (data: z.infer<typeof registerSchema>) => {
    try {
      const { confirmPassword, ...userData } = data;
      await registerMutation.mutateAsync(userData);

      // Wait a brief moment before showing the toast
      setTimeout(() => {
        toast({
          title: "Security information saved",
          description:
            "Be sure to remember your security question, answer, and PIN for account recovery.",
          variant: "default",
        });
      }, 100);
    } catch (error) {
      toast({
        title: "Registration failed",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred during registration",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Password Recovery Dialog */}
      <Dialog open={recoveryMode} onOpenChange={setRecoveryMode}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {recoveryStep > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 mr-2"
                  onClick={() => setRecoveryStep(recoveryStep - 1)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              {recoveryStep === 1 && <KeyRound className="h-5 w-5 mr-2" />}
              {recoveryStep === 1 && "Recover Your Password"}
              {recoveryStep === 2 && "Security Question"}
              {recoveryStep === 3 && "Reset Password"}
            </DialogTitle>
            <DialogDescription>
              {recoveryStep === 1 &&
                "Enter your username to start the recovery process."}
              {recoveryStep === 2 &&
                "Answer your security question to verify your identity."}
              {recoveryStep === 3 &&
                "Enter your 4-digit recovery PIN and choose a new password."}
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-sm p-3 rounded-md mb-4">
              {errorMsg}
            </div>
          )}

          {recoveryStep === 1 && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input
                  value={recoveryUsername}
                  onChange={(e) => setRecoveryUsername(e.target.value)}
                  placeholder="Enter your username"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={cancelRecovery}>
                  Cancel
                </Button>
                <Button onClick={checkUsername} disabled={recoveryLoading}>
                  {recoveryLoading && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Continue
                </Button>
              </div>
            </div>
          )}

          {recoveryStep === 2 && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Security Question</label>
                <div className="p-3 bg-muted rounded-md text-sm">
                  {securityQuestion}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Answer</label>
                <Input
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Enter your answer"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={cancelRecovery}>
                  Cancel
                </Button>
                <Button
                  onClick={verifySecurityAnswer}
                  disabled={recoveryLoading}
                >
                  {recoveryLoading && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Verify
                </Button>
              </div>
            </div>
          )}

          {recoveryStep === 3 && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Recovery PIN (4 digits)
                </label>
                <Input
                  value={recoveryPin}
                  onChange={(e) => setRecoveryPin(e.target.value)}
                  maxLength={4}
                  placeholder="Enter your 4-digit PIN"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create a new password"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm your new password"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={cancelRecovery}>
                  Cancel
                </Button>
                <Button onClick={resetPassword} disabled={recoveryLoading}>
                  {recoveryLoading && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Reset Password
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Auth Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center p-8">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-8 text-center">
            <img 
              src="/VibeTracker_logo_transparent.png" 
              alt="VibeTracker Logo" 
              className="h-20 mx-auto mb-2"
            />
            <h2 className="text-3xl font-bold mb-2">VibeTracker</h2>
            <p className="text-gray-500 dark:text-gray-400">
              Track your activities and optimize your time
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form
                  onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="username"
                            placeholder="username"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="stayLoggedIn"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-1">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Stay logged in for 30 days</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Login
                  </Button>

                  <div className="text-center mt-4">
                    <Button
                      variant="link"
                      type="button"
                      onClick={startRecovery}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      Forgot your password?
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register">
              <Form {...registerForm}>
                <form
                  onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Choose a username" autoComplete="username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Create a password"
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Confirm your password"
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="securityQuestion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Security Question</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Example: What was your first pet's name?"
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="securityAnswer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Security Answer</FormLabel>
                        <FormControl>
                          <Input placeholder="Your answer" autoComplete="off" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="recoveryPin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recovery PIN (4 digits)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Set a 4-digit PIN"
                            autoComplete="off"
                            {...field}
                            maxLength={4}
                            inputMode="numeric"
                            pattern="[0-9]*"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Create Account
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hidden md:block md:w-1/2 bg-gray-100 dark:bg-gray-900 p-12 flex flex-col justify-center">
        <div className="max-w-md mx-auto">
          <div className="flex flex-col items-center justify-center mb-6">
            <img src="/VibeTracker_logo_transparent.png" alt="VibeTracker Logo" className="h-24 w-24 mb-4" />
            <h1 className="text-4xl font-bold text-center dark:text-white">
              Welcome to VibeTracker
            </h1>
            <div className="mt-2">
              <a 
                href="https://github.com/scottbrodersen/VibeTracker" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 mr-1">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                </svg>
                GitHub Repository
              </a>
            </div>
          </div>
          <div className="space-y-6 text-gray-600 dark:text-gray-300">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h3 className="font-medium mb-1">
                Track your habits and routines
              </h3>
              <p className="text-sm">
                Create custom timers for each of your daily activities and track
                elapsed time since last completed.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h3 className="font-medium mb-1">Visualize your progress</h3>
              <p className="text-sm">
                See charts and statistics about your activity patterns over
                time.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h3 className="font-medium mb-1">Stay on track</h3>
              <p className="text-sm">
                Set minimum and target times for your activities to maintain
                healthy routines.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
