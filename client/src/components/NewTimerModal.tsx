import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NewTimerModalProps {
  open: boolean;
  onClose: () => void;
}

type TimeUnit = "minutes" | "hours" | "days";

// Helper for converting time to seconds
const toSeconds = (value: number, unit: TimeUnit): number => {
  switch (unit) {
    case "minutes":
      return value * 60;
    case "hours":
      return value * 60 * 60;
    case "days":
      return value * 24 * 60 * 60;
    default:
      return value;
  }
};

export default function NewTimerModal({ open, onClose }: NewTimerModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [minTime, setMinTime] = useState<number | "">("");
  const [minTimeUnit, setMinTimeUnit] = useState<TimeUnit>("hours");
  const [maxTime, setMaxTime] = useState<number | "">("");
  const [maxTimeUnit, setMaxTimeUnit] = useState<TimeUnit>("hours");
  const [playSound, setPlaySound] = useState(true);

  const handleSubmit = async () => {
    if (!name) {
      toast({
        title: "Error",
        description: "Timer name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Convert times to seconds
      const minTimeSeconds = minTime !== "" ? toSeconds(minTime, minTimeUnit) : 0;
      const maxTimeSeconds = maxTime !== "" ? toSeconds(maxTime, maxTimeUnit) : null;
      
      // Validate max time is greater than min time
      if (maxTimeSeconds !== null && minTimeSeconds >= maxTimeSeconds) {
        toast({
          title: "Invalid Time Values",
          description: "Target time must be greater than minimum time",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const timerData = {
        label: name,
        minTime: minTimeSeconds,
        maxTime: maxTimeSeconds,
        isEnabled: true,
        playSound,
        color: "#007AFF", // iOS blue default
      };

      await apiRequest("POST", "/api/timers", timerData);
      
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
      
      toast({
        title: "Success",
        description: `Timer "${name}" has been created`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create timer",
        variant: "destructive",
      });
      console.error("Error creating timer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">New Timer</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="timer-name" className="block text-sm font-medium text-gray-700 mb-1">
              Timer Name
            </Label>
            <Input
              id="timer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Coffee Break"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <Label htmlFor="min-time" className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Time
            </Label>
            <div className="flex space-x-2">
              <Input
                id="min-time"
                type="number"
                min="0"
                value={minTime}
                onChange={(e) => setMinTime(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0"
                className="w-1/2"
              />
              <Select
                value={minTimeUnit}
                onValueChange={(value) => setMinTimeUnit(value as TimeUnit)}
              >
                <SelectTrigger className="w-1/2">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="max-time" className="block text-sm font-medium text-gray-700 mb-1">
              Target Time
            </Label>
            <div className="flex space-x-2">
              <Input
                id="max-time"
                type="number"
                min="0"
                value={maxTime}
                onChange={(e) => setMaxTime(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0"
                className="w-1/2"
              />
              <Select
                value={maxTimeUnit}
                onValueChange={(value) => setMaxTimeUnit(value as TimeUnit)}
              >
                <SelectTrigger className="w-1/2">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="sound-alert" 
              checked={playSound}
              onCheckedChange={(checked) => setPlaySound(checked === true)}
            />
            <Label htmlFor="sound-alert" className="text-sm">
              Play sound when minimum time is reached
            </Label>
          </div>
        </div>
        
        <DialogFooter className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-500 text-white"
          >
            {isSubmitting ? "Creating..." : "Create Timer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
