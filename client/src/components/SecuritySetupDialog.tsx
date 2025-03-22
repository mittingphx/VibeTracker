import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";
import { User } from "@shared/schema";

interface SecuritySetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onComplete: () => void;
}

export default function SecuritySetupDialog({
  open,
  onOpenChange,
  user,
  onComplete,
}: SecuritySetupDialogProps) {
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [recoveryPin, setRecoveryPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleSubmit = async () => {
    // Validate fields
    if (!securityQuestion.trim()) {
      setError("Please enter a security question");
      return;
    }
    if (!securityAnswer.trim()) {
      setError("Please enter a security answer");
      return;
    }
    if (!/^\d{4}$/.test(recoveryPin)) {
      setError("Recovery PIN must be exactly 4 digits");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const response = await apiRequest("POST", "/api/user/security", {
        securityQuestion,
        securityAnswer,
        recoveryPin,
      });

      if (response.ok) {
        toast({
          title: "Security information saved",
          description: "Your account recovery information has been set up successfully.",
        });
        onComplete();
      } else {
        const data = await response.json();
        setError(data.message || "Failed to save security information");
      }
    } catch (error) {
      console.error("Security setup error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ShieldCheck className="h-5 w-5 mr-2 text-blue-500" />
            Set Up Account Recovery
          </DialogTitle>
          <DialogDescription>
            Create a security question, answer, and recovery PIN to help you
            recover your account if you forget your password.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Security Question</label>
            <Input
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              placeholder="Example: What was your first pet's name?"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Security Answer</label>
            <Input
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              placeholder="Answer to your security question"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Recovery PIN (4 digits)</label>
            <Input
              value={recoveryPin}
              onChange={(e) => {
                // Allow only digits
                const value = e.target.value.replace(/[^0-9]/g, "");
                if (value.length <= 4) {
                  setRecoveryPin(value);
                }
              }}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="4-digit PIN"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Important: Remember your PIN. You'll need it to reset your password.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Skip for now
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}