import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface NewTimerModalProps {
  open: boolean;
  onClose: () => void;
}

type TimeUnit = "seconds" | "minutes" | "hours" | "days";

// Helper for converting time to seconds
const toSeconds = (value: number, unit: TimeUnit): number => {
  switch (unit) {
    case "seconds":
      return value;
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
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Default");
  const [minTime, setMinTime] = useState<number | "">("");
  const [minTimeUnit, setMinTimeUnit] = useState<TimeUnit>("hours");
  const [maxTime, setMaxTime] = useState<number | "">("");
  const [maxTimeUnit, setMaxTimeUnit] = useState<TimeUnit>("hours");
  const [playSound, setPlaySound] = useState(true);
  const [displayType, setDisplayType] = useState<"bar" | "wheel">("wheel");

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a timer",
        variant: "destructive",
      });
      return;
    }
    
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
        userId: user.id, // Include the user ID from the authenticated user
        label: name,
        category: category || "Default",
        minTime: minTimeSeconds,
        maxTime: maxTimeSeconds,
        isEnabled: true,
        playSound,
        color: "#007AFF", // iOS blue default
        displayType, // Add display type to the timer data
      };

      console.log("Submitting timer with data:", timerData);
      
      try {
        console.log("Making API request to create timer with user:", user);
        const response = await apiRequest("POST", "/api/timers", timerData);
        console.log("Timer creation response:", response);
        
        if (!response.ok) {
          // If the response is not ok, try to parse the error
          const errorData = await response.json().catch(() => ({}));
          console.error("Server error response:", errorData);
          throw new Error(errorData.message || "Failed to create timer. Server returned an error.");
        }
        
        // Query client invalidation and success handling
        queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
        
        toast({
          title: "Success",
          description: `Timer "${name}" has been created`,
        });
        
        onClose();
      } catch (error) {
        console.error("Error submitting timer:", error);
        throw error;
      }
    } catch (error: any) {
      console.error("Error creating timer:", error);
      toast({
        title: "Error Creating Timer",
        description: error.message || "Failed to create timer. Please try again.",
        variant: "destructive",
      });
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
            <Label htmlFor="timer-category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </Label>
            <Input
              id="timer-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Health, Productivity, Habits"
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
                  <SelectItem value="seconds">Seconds</SelectItem>
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
                  <SelectItem value="seconds">Seconds</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Display Type
            </Label>
            <RadioGroup 
              value={displayType} 
              onValueChange={(value) => setDisplayType(value as "bar" | "wheel")}
              className="flex space-x-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem 
                  value="bar" 
                  id="display-bar" 
                  className="border-2 border-gray-400 data-[state=checked]:border-white data-[state=checked]:bg-white dark:data-[state=checked]:ring-2 dark:data-[state=checked]:ring-white dark:data-[state=checked]:ring-offset-2" 
                />
                <Label htmlFor="display-bar" className="text-sm font-medium">Progress Bar</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem 
                  value="wheel" 
                  id="display-wheel" 
                  className="border-2 border-gray-400 data-[state=checked]:border-white data-[state=checked]:bg-white dark:data-[state=checked]:ring-2 dark:data-[state=checked]:ring-white dark:data-[state=checked]:ring-offset-2" 
                />
                <Label htmlFor="display-wheel" className="text-sm font-medium">Progress Wheel</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="sound-alert" 
              checked={playSound}
              onCheckedChange={(checked) => setPlaySound(checked === true)}
              className="border-2 border-gray-400 data-[state=checked]:border-white data-[state=checked]:bg-white dark:data-[state=checked]:ring-2 dark:data-[state=checked]:ring-white dark:data-[state=checked]:ring-offset-2"
            />
            <Label htmlFor="sound-alert" className="text-sm font-medium">
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
