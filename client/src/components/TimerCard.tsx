import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Clock, Redo2, Undo2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { EnhancedTimer } from "@shared/schema";
import { formatTimeDuration } from "@/utils/timeUtils";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/lib/soundEffects";

interface TimerCardProps {
  timer: EnhancedTimer;
}

export default function TimerCard({ timer }: TimerCardProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  // Get most recent history entry for this timer to enable undo/redo
  const history = timer.lastPressed ? 
    { id: 0, timestamp: timer.lastPressed } : null;

  const handleTimerPress = async () => {
    if (!timer.canPress) {
      toast({
        title: "Minimum time not reached",
        description: `You need to wait at least ${formatTimeDuration(timer.minTime)}`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdating(true);
      const res = await apiRequest("POST", `/api/timers/${timer.id}/press`);
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
      
      toast({
        title: "Timer updated",
        description: `${timer.label} timer has been reset`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update timer",
        variant: "destructive",
      });
      console.error("Error updating timer:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUndo = async () => {
    if (!history) return;
    
    try {
      setIsUpdating(true);
      // This would need to be implemented with proper history ID from backend
      // For now, just refresh the timers
      await apiRequest("PATCH", `/api/history/${history.id}`, { isActive: false });
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
      
      toast({
        title: "Undo successful",
        description: `Undid timer press for ${timer.label}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to undo timer action",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRedo = async () => {
    if (!history) return;
    
    try {
      setIsUpdating(true);
      // This would need to be implemented with proper history ID from backend
      await apiRequest("PATCH", `/api/history/${history.id}`, { isActive: true });
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
      
      toast({
        title: "Redo successful",
        description: `Restored timer press for ${timer.label}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to redo timer action",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Determine colors based on progress and timer state
  let progressColor = timer.color;
  let timeTextColor = "text-gray-900";
  
  if (!timer.canPress) {
    progressColor = "#FF3B30"; // iOS red
    timeTextColor = "text-red-500";
  } else if (timer.maxTime && timer.elapsedTime >= timer.maxTime) {
    progressColor = "#FF3B30"; // iOS red
    timeTextColor = "text-red-500";
    
    // Play sound if enabled and just reached the max time
    if (timer.playSound && Math.abs(timer.elapsedTime - timer.maxTime) < 10) {
      playSound("alert");
    }
  } else if (timer.minTime && timer.elapsedTime >= timer.minTime && timer.elapsedTime < (timer.minTime + 10)) {
    // Play sound when min time is just reached (within 10 seconds)
    if (timer.playSound) {
      playSound("ready");
    }
  }

  const buttonDisabled = isUpdating || !timer.canPress || !timer.isEnabled;

  return (
    <Card className="mb-4 overflow-hidden shadow-sm bg-white">
      <CardContent className="px-5 py-4 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            {/* Timer Label */}
            <h2 className="text-lg font-semibold text-gray-900">{timer.label}</h2>
            
            {/* Timer Elapsed Time */}
            <p className={`text-3xl font-bold ${timeTextColor} mt-1`}>
              {formatTimeDuration(timer.elapsedTime)}
            </p>
            
            {/* Last Clicked Date */}
            <p className="text-xs text-gray-600 mt-1">
              {timer.lastPressed 
                ? `Last: ${formatDistanceToNow(timer.lastPressed, { addSuffix: true })}` 
                : "No records yet"}
            </p>
          </div>
          
          {/* Timer Controls */}
          <div className="flex flex-col items-center">
            {/* Undo Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-600 hover:text-gray-800 p-1 h-8 w-8"
              onClick={handleUndo}
              disabled={!history || isUpdating}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            
            {/* Main Timer Button */}
            <Button
              style={{ backgroundColor: buttonDisabled ? "#C7C7CC" : timer.color }}
              size="icon"
              className="text-white rounded-full w-14 h-14 flex items-center justify-center mt-1 shadow-md"
              onClick={handleTimerPress}
              disabled={buttonDisabled}
            >
              <Clock className="h-6 w-6" />
              {isUpdating && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </span>
              )}
            </Button>
            
            {/* Redo Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-600 hover:text-gray-800 p-1 mt-1 h-8 w-8"
              onClick={handleRedo}
              disabled={!history || isUpdating}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Progress Bar for Min/Max Time */}
        <Progress 
          value={timer.progress} 
          className="h-2 mt-2"
          indicatorColor={progressColor}
        />
        
        {/* Min/Max Time Display */}
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>Min: {formatTimeDuration(timer.minTime, true)}</span>
          {timer.maxTime && (
            <span>Target: {formatTimeDuration(timer.maxTime, true)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
