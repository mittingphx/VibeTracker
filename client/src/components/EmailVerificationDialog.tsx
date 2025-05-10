import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RefreshCcw } from "lucide-react";

interface EmailVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string | null;
  emailVerified: boolean | null;
  userId: number;
  onComplete: () => void;
}

export default function EmailVerificationDialog({
  open,
  onOpenChange,
  currentEmail,
  emailVerified,
  userId,
  onComplete,
}: EmailVerificationDialogProps) {
  const [email, setEmail] = useState(currentEmail || "");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const { toast } = useToast();

  const emailMutation = useMutation({
    mutationFn: async (newEmail: string) => {
      const res = await apiRequest("POST", "/api/user/email", { email: newEmail });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update email");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email verification sent",
        description: "Please check your inbox for the verification link",
      });
      setStatus("success");
      onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update email",
        description: error.message,
        variant: "destructive",
      });
      setStatus("error");
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/resend-verification", {});
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to resend verification email");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification email sent",
        description: "Please check your inbox for the verification link",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send verification email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("submitting");
    emailMutation.mutate(email);
  };

  const handleResend = () => {
    resendMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[450px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <DialogHeader className="bg-amber-200 dark:bg-amber-900/80 -m-6 mb-2 p-6 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="text-gray-900 dark:text-white">Email Verification</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            {emailVerified
              ? "Your email has been verified. You can update it if needed."
              : currentEmail
                ? "Your email address is not verified. Please verify your email or update it below."
                : "Please provide your email address for account verification."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Email Address
              </label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                className="w-full"
                disabled={status === "submitting" || emailMutation.isPending || resendMutation.isPending}
              />
            </div>

            {currentEmail && !emailVerified && (
              <div className="space-y-2">
                <div className="text-sm text-amber-500 dark:text-amber-400">
                  Your email is not verified. Please check your inbox for the verification link
                  or use one of the options below.
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 mt-2">
                  <p className="text-center mb-3 font-medium">Verification Options</p>
                  
                  {/* Resend verification email button */}
                  <div className="mx-auto max-w-[280px] mb-4">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      className="w-full"
                      onClick={handleResend}
                      disabled={resendMutation.isPending || emailMutation.isPending}
                    >
                      {resendMutation.isPending ? "Sending..." : "Resend Verification Email"}
                    </Button>
                  </div>
                  
                  {/* Direct verification button */}
                  <div className="mx-auto max-w-[280px] mb-4">
                    <Button 
                      type="button"
                      variant="secondary"
                      className="w-full flex items-center justify-center"
                      onClick={() => {
                        // Show loading toast
                        toast({
                          title: "Getting verification link...",
                          description: "Please wait...",
                        });
                        
                        fetch('/api/debug/get-token')
                          .then(res => res.json())
                          .then(data => {
                            if (data.success) {
                              // Show success toast with link and popup warning
                              toast({
                                title: "Verification link ready",
                                description: "Verification page opened in a new tab. If you don't see it, please check your popup blocker.",
                                duration: 8000,
                              });
                              
                              // Open the verification URL in a new tab
                              window.open(data.verificationUrl, '_blank');
                            } else {
                              toast({
                                title: "Error",
                                description: data.message,
                                variant: "destructive",
                              });
                            }
                          })
                          .catch(err => {
                            toast({
                              title: "Error",
                              description: "Failed to get verification link",
                              variant: "destructive",
                            });
                          });
                      }}
                    >
                      <RefreshCcw className="w-4 h-4 mr-2" />
                      Verify Email Directly
                    </Button>
                    <p className="text-xs text-center mt-1 text-amber-500 dark:text-amber-400">
                      Note: You may need to allow pop-ups for this site
                    </p>
                  </div>
                  
                  {/* Skip options */}
                  <div className="grid grid-cols-2 gap-2 max-w-[280px] mx-auto">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center justify-center"
                      onClick={async () => {
                        try {
                          // Show dialog for security info
                          const securityQuestion = prompt("For security, please enter a security question");
                          if (!securityQuestion) return;
                          
                          const securityAnswer = prompt("Please enter the answer to your security question");
                          if (!securityAnswer) return;
                          
                          const recoveryPin = prompt("Please enter a 4-digit recovery PIN (numbers only)");
                          if (!recoveryPin || !/^\d{4}$/.test(recoveryPin)) {
                            toast({
                              title: "Invalid PIN",
                              description: "Recovery PIN must be 4 digits",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          // Show loading toast
                          toast({
                            title: "Setting up security and verifying email...",
                            description: "Please wait...",
                          });
                          
                          // Create the request body
                          const requestBody = {
                            securityQuestion,
                            securityAnswer,
                            recoveryPin,
                            emailVerified: true
                          };
                          
                          // Log the request for debugging
                          console.log("Sending security request:", JSON.stringify(requestBody));
                          
                          const res = await fetch(`/api/user/security`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(requestBody),
                          });
                          
                          if (res.ok) {
                            toast({
                              title: "Success!",
                              description: "Your email has been marked as verified and security info saved",
                            });
                            queryClient.invalidateQueries({ queryKey: ["/api/user"] });
                            onComplete();
                          } else {
                            const error = await res.json();
                            toast({
                              title: "Verification failed",
                              description: error.message || "Unable to verify email",
                              variant: "destructive",
                            });
                          }
                        } catch (err) {
                          toast({
                            title: "Verification failed",
                            description: "An unexpected error occurred",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Just Trust Me
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center justify-center"
                      onClick={onComplete}
                    >
                      Skip For Now
                    </Button>
                  </div>
                  <p className="text-xs text-center mt-1 text-muted-foreground max-w-[280px] mx-auto">
                    "Just Trust Me" bypasses verification with security setup.
                  </p>
                  
                  {/* Tips section */}
                  <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium text-center">
                      Troubleshooting Tips
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <li>Check your spam folder for verification emails</li>
                      <li>Try refreshing the page and re-entering your email</li>
                      <li>Contact support if you continue to have issues</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col w-full">
              <div className="mx-auto w-full max-w-[280px]">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={!email || status === "submitting" || emailMutation.isPending}
                >
                  {emailMutation.isPending ? "Saving..." : currentEmail ? "Update Email" : "Save Email"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}