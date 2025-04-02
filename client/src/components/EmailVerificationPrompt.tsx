import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import EmailVerificationDialog from './EmailVerificationDialog';

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
          <DialogHeader className="bg-amber-100 dark:bg-amber-900/40 -m-6 mb-2 p-6 border-b border-gray-200 dark:border-gray-700">
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
              </div>
            ) : (
              <div className="text-sm space-y-2 text-gray-700 dark:text-gray-200">
                <p>
                  You haven't provided an email address yet. Adding an email is important for account security.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 flex-col sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={handleSkip}>
              Skip for now
            </Button>
            <div className="flex gap-2">
              {user?.email ? (
                <Button 
                  onClick={handleResend} 
                  disabled={resendMutation.isPending}
                >
                  {resendMutation.isPending ? "Sending..." : "Resend verification email"}
                </Button>
              ) : (
                <Button 
                  onClick={handleSetupEmail}
                >
                  <Mail className="mr-2 h-4 w-4" /> Set up email address
                </Button>
              )}
            </div>
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