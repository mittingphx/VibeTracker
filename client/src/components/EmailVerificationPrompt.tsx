import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Mail, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import EmailVerificationDialog from './EmailVerificationDialog';
import { Separator } from '@/components/ui/separator';

interface EmailVerificationPromptProps {
  onSkip: () => void;
}

export default function EmailVerificationPrompt({ onSkip }: EmailVerificationPromptProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

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

  const handleResend = () => {
    if (user?.email) {
      resendMutation.mutate();
    } else {
      setEmailDialogOpen(true);
    }
  };

  const handleSkip = () => {
    setOpen(false);
    onSkip();
  };

  const handleSetupEmail = () => {
    setEmailDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <DialogHeader className="bg-amber-200 dark:bg-amber-900/80 -m-6 mb-2 p-6 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Email Verification Required
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Verifying your email address enhances security and enables features like password recovery.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {user?.email ? (
              <div className="text-sm space-y-2 text-gray-700 dark:text-gray-200">
                <p>
                  Your email address <span className="font-medium">{user.email}</span> is not verified.
                </p>
                <p>
                  We've sent a verification link to your email. Please check your inbox and click the link to verify your account.
                </p>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Trouble receiving emails?</p>
                  <Button 
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="w-full mt-1 flex items-center justify-center"
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
                  <p className="text-xs text-center mt-1 text-muted-foreground">
                    No need to wait for an email - click to verify now!
                  </p>
                  <p className="text-xs text-center mt-1 text-amber-500 dark:text-amber-400">
                    Note: You may need to allow pop-ups for this site
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-sm space-y-2 text-gray-700 dark:text-gray-200">
                <p>
                  You haven't provided an email address yet. Adding an email is important for account security.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 flex-col">
            <div className="flex gap-2 flex-col w-full">
              {user?.email ? (
                <Button 
                  onClick={handleResend} 
                  disabled={resendMutation.isPending}
                  className="w-full"
                >
                  {resendMutation.isPending ? "Sending..." : "Resend verification email"}
                </Button>
              ) : (
                <Button 
                  onClick={handleSetupEmail}
                  className="w-full"
                >
                  <Mail className="mr-2 h-4 w-4" /> Set up email address
                </Button>
              )}
              
              {user?.email && !user?.emailVerified && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    try {
                      // Show loading toast
                      toast({
                        title: "Verifying email...",
                        description: "Please wait...",
                      });
                      
                      const res = await fetch(`/api/user/security`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          emailVerified: true
                        }),
                      });
                      
                      if (res.ok) {
                        toast({
                          title: "Success!",
                          description: "Your email has been marked as verified",
                        });
                        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
                        setOpen(false);
                        onSkip();
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
                  Just Trust Me (Skip Verification)
                </Button>
              )}
            </div>
            
            <Button variant="ghost" onClick={handleSkip} className="w-full mt-2">
              Skip for now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {user && (
        <EmailVerificationDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          currentEmail={user.email || null}
          emailVerified={user.emailVerified || false}
          userId={user.id}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/user"] });
            setEmailDialogOpen(false);
          }}
        />
      )}
    </>
  );
}