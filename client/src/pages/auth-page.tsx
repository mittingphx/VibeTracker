import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TimerOff } from "lucide-react";

// Create authentication schemas based on insert user schema
const loginSchema = insertUserSchema.pick({
  username: true,
  password: true,
});

// Add password confirmation for registration
const registerSchema = insertUserSchema
  .pick({
    username: true,
    password: true,
  })
  .extend({
    confirmPassword: z.string().min(1, "Confirm password is required"),
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

  // Login form handling
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  // Register form handling
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onRegisterSubmit = (data: z.infer<typeof registerSchema>) => {
    const { confirmPassword, ...userData } = data;
    registerMutation.mutate(userData);
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
      {/* Auth Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center p-8">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold mb-2">VibeTimer</h2>
            <p className="text-gray-500 dark:text-gray-400">Track your activities and optimize your time</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="username" {...field} />
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
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
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
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Choose a username" {...field} />
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
                          <Input type="password" placeholder="Create a password" {...field} />
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
                          <Input type="password" placeholder="Confirm your password" {...field} />
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
          <div className="flex items-center justify-center mb-6 text-blue-500">
            <TimerOff className="h-16 w-16" />
          </div>
          <h1 className="text-4xl font-bold mb-6 text-center dark:text-white">Welcome to VibeTimer</h1>
          <div className="space-y-6 text-gray-600 dark:text-gray-300">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h3 className="font-medium mb-1">Track your habits and routines</h3>
              <p className="text-sm">Create custom timers for each of your daily activities and track elapsed time since last completed.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h3 className="font-medium mb-1">Visualize your progress</h3>
              <p className="text-sm">See charts and statistics about your activity patterns over time.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h3 className="font-medium mb-1">Stay on track</h3>
              <p className="text-sm">Set minimum and target times for your activities to maintain healthy routines.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}