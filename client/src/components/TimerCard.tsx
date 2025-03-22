import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Clock, Redo2, Undo2, Archive, MoreVertical, Settings } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { EnhancedTimer } from "@shared/schema";
import { formatTimeDuration } from "@/utils/timeUtils";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/lib/soundEffects";
import { useTimerHistory } from "@/hooks/useTimerHistory";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TimerCardProps {
  timer: EnhancedTimer;
  onArchive?: (id: number) => void;
}

export default function TimerCard({ timer, onArchive }: TimerCardProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Handle archive
  const handleArchive = async () => {
    try {
      setIsUpdating(true);
      await apiRequest("POST", `/api/timers/${timer.id}/archive`, {});
      
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
      
      // Also call the onArchive callback if provided
      if (onArchive) {
        onArchive(timer.id);
      }
      
      toast({
        title: "Timer Archived",
        description: `${timer.label} has been moved to archives`,
      });
    } catch (error) {
      console.error("Error archiving timer:", error);
      toast({
        title: "Error",
        description: "Failed to archive timer",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Use the timer history hook to manage undo/redo functionality
  const { 
    canUndo, 
    canRedo, 
    isUndoing, 
    isRedoing, 
    handleUndo: onHistoryUndo,
    handleRedo: onHistoryRedo
  } = useTimerHistory({ 
    timerId: timer.id,
    enabled: true
  });

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
    try {
      setIsUpdating(true);
      await onHistoryUndo();
      
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
    try {
      setIsUpdating(true);
      await onHistoryRedo();
      
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
            {/* Timer Label and Actions */}
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">{timer.label}</h2>
              
              {/* Timer Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    className="flex items-center cursor-pointer"
                    onClick={handleTimerPress}
                    disabled={!timer.canPress || !timer.isEnabled}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    <span>Press Timer</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    className="flex items-center cursor-pointer"
                    onClick={handleUndo}
                    disabled={!canUndo || isUpdating || isUndoing || isRedoing}
                  >
                    <Undo2 className="mr-2 h-4 w-4" />
                    <span>Undo</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    className="flex items-center cursor-pointer"
                    onClick={handleRedo}
                    disabled={!canRedo || isUpdating || isUndoing || isRedoing}
                  >
                    <Redo2 className="mr-2 h-4 w-4" />
                    <span>Redo</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    className="flex items-center cursor-pointer"
                    onClick={() => {
                      // Use a callback to navigate to settings tab and highlight this timer
                      const event = new CustomEvent('navigateToSettings', {
                        detail: { timerId: timer.id }
                      });
                      window.dispatchEvent(event);
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    className="flex items-center cursor-pointer text-red-500"
                    onClick={handleArchive}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    <span>Archive</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Timer Elapsed Time */}
            <p className={`text-3xl font-bold ${timeTextColor} mt-1`}>
              {formatTimeDuration(timer.elapsedTime)}
            </p>
            <p className={`text-sm ${timeTextColor} -mt-1`}>
              {timer.elapsedTime.toLocaleString()} seconds
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
              disabled={!canUndo || isUpdating || isUndoing || isRedoing}
            >
              <Undo2 className="h-4 w-4" />
              {isUndoing && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                </span>
              )}
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
              disabled={!canRedo || isUpdating || isUndoing || isRedoing}
            >
              <Redo2 className="h-4 w-4" />
              {isRedoing && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                </span>
              )}
            </Button>
          </div>
        </div>
        
        {/* Progress Bar for Min/Max Time */}
        <Progress 
          value={timer.progress} 
          className="h-2 mt-2"
          indicatorStyle={{ backgroundColor: progressColor }}
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
