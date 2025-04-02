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
import { apiRequest } from "@/lib/queryClient";

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
        <DialogHeader className="bg-amber-100 dark:bg-amber-900/40 -m-6 mb-2 p-6 border-b border-gray-200 dark:border-gray-700">
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
              <div className="text-sm text-amber-500 dark:text-amber-400">
                Your email is not verified. Please check your inbox for the verification link
                or resend it below.
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            {currentEmail && !emailVerified && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleResend}
                disabled={resendMutation.isPending || emailMutation.isPending}
              >
                {resendMutation.isPending ? "Sending..." : "Resend Verification"}
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={!email || status === "submitting" || emailMutation.isPending}
            >
              {emailMutation.isPending ? "Saving..." : currentEmail ? "Update Email" : "Save Email"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}