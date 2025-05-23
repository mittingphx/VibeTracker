import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProgressWheel } from "@/components/ui/progress-wheel";
import { Button } from "@/components/ui/button";
import { Clock, Redo2, Undo2, Archive, MoreVertical, Settings, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { EnhancedTimer } from "@shared/schema";
import { formatTimeDuration } from "@/utils/timeUtils";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { playSound } from "@/lib/soundEffects";
import { useTimerHistory } from "@/hooks/useTimerHistory";
import { getThemePreference } from "@/lib/themeUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TimerCardProps {
  timer: EnhancedTimer;
  onArchive?: (id: number) => void;
  onViewHistory?: (id: number, label: string) => void;
}

export default function TimerCard({ timer, onArchive, onViewHistory }: TimerCardProps) {
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

  // Get the user for their day start hour preference
  const { user } = useAuth();
  
  // Use the timer history hook to manage undo/redo functionality and press counts
  const { 
    canUndo, 
    canRedo, 
    isUndoing, 
    isRedoing, 
    handleUndo: onHistoryUndo,
    handleRedo: onHistoryRedo,
    countPressesToday,
    countPressesSinceTime
  } = useTimerHistory({ 
    timerId: timer.id,
    enabled: true,
    dayStartHour: user?.dayStartHour || 0
  });
  
  // Get the number of times this timer has been pressed today
  const todayPressCount = countPressesToday();

  const handleTimerPress = async () => {
    // For timers with no previous presses, allow the first press regardless of canPress status
    if (!timer.canPress && timer.lastPressed) {
      toast({
        title: "Minimum time not reached",
        description: `You need to wait at least ${formatTimeDuration(timer.minTime)}. You can use View History to add presses manually.`,
        variant: "destructive",
      });
      return;
    }

    // If timer is disabled, show a message instead of doing nothing
    if (!timer.isEnabled) {
      toast({
        title: "Timer disabled",
        description: "This timer is currently disabled. Enable it in settings to use it.",
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
        description: !timer.lastPressed 
          ? `Started tracking ${timer.label}` 
          : `${timer.label} timer has been reset`,
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

  // Get theme preference
  const isDarkMode = getThemePreference();
  
  // Determine colors based on progress and timer state
  let progressColor = timer.color;
  let timeTextColor = isDarkMode ? "text-gray-100" : "text-gray-900";
  
  // Create a gradient background for the progress bar to simulate the wheel segments
  let progressGradient = `linear-gradient(to right, 
    #FF3B30 0%, 
    #FF3B30 33%, 
    #FFCC00 33%, 
    #FFCC00 66%, 
    #34C759 66%, 
    #34C759 100%)`;
  
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

  // Only disable the button if the timer is updating or if it's explicitly disabled in settings
  // We'll handle the minimum time warning in the handleTimerPress function
  const buttonDisabled = isUpdating || !timer.isEnabled;

  return (
    <Card className={`mb-4 overflow-hidden shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <CardContent className="px-5 py-4 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            {/* Timer Label */}
            <div>
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{timer.label}</h2>
              {timer.category && timer.category !== "Default" && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                  {timer.category}
                </span>
              )}
            </div>
            
            {/* Timer Elapsed Time */}
            <p className={`text-3xl font-bold ${timeTextColor} mt-1`}>
              {formatTimeDuration(timer.elapsedTime)}
            </p>
            {/* Only show total seconds display when enabled in timer settings */}
            {timer.showTotalSeconds && (
              <p className={`text-sm ${timeTextColor} -mt-1`}>
                {timer.elapsedTime < 60 
                  ? `${timer.elapsedTime} ${timer.elapsedTime === 1 ? 'second' : 'seconds'}`
                  : `${timer.elapsedTime.toLocaleString()} seconds total`}
              </p>
            )}
            
            {/* Last Clicked Date */}
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
              {timer.lastPressed 
                ? `Last: ${formatDistanceToNow(timer.lastPressed, { addSuffix: true })}` 
                : "No records yet"}
            </p>
            
            {/* Today's press count */}
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {todayPressCount > 0 
                ? `Today: ${todayPressCount} ${todayPressCount === 1 ? 'press' : 'presses'}` 
                : "No presses today"}
            </p>
          </div>
          
          {/* Right side: Control buttons and timer */}
          <div className="flex flex-col items-end ml-2">
            {/* Top row: Control buttons */}
            <div className="flex items-center">
              {/* Undo Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'} p-1 h-8 w-8`}
                onClick={handleUndo}
                disabled={!canUndo || isUpdating || isUndoing || isRedoing}
              >
                <Undo2 className="h-4 w-4" />
                {isUndoing && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-3 h-3 border-2 ${isDarkMode ? 'border-gray-400' : 'border-gray-500'} border-t-transparent rounded-full animate-spin`}></div>
                  </span>
                )}
              </Button>
              
              {/* Redo Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'} p-1 h-8 w-8`}
                onClick={handleRedo}
                disabled={!canRedo || isUpdating || isUndoing || isRedoing}
              >
                <Redo2 className="h-4 w-4" />
                {isRedoing && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-3 h-3 border-2 ${isDarkMode ? 'border-gray-400' : 'border-gray-500'} border-t-transparent rounded-full animate-spin`}></div>
                  </span>
                )}
              </Button>
              
              {/* Timer Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className={`h-8 w-8 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    className="flex items-center cursor-pointer"
                    onClick={handleTimerPress}
                    disabled={!timer.isEnabled}
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
                    className="flex items-center cursor-pointer"
                    onClick={() => onViewHistory && onViewHistory(timer.id, timer.label)}
                  >
                    <History className="mr-2 h-4 w-4" />
                    <span>View History</span>
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
            
            {/* Bottom row: Timer and progress wheel */}
            <div className="flex items-center mt-2">
              {/* Progress Wheel - Only when wheel display type is selected */}
              {timer.displayType === 'wheel' && (
                <div className="mr-3">
                  <ProgressWheel 
                    value={timer.progress}
                    size={80}
                    thickness={12}
                    minColor="#FF3B30" // iOS red
                    targetColor="#FFCC00" // iOS yellow
                    overColor="#34C759" // iOS green
                  />
                </div>
              )}
              
              {/* Main Timer Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      style={{ backgroundColor: buttonDisabled ? "#C7C7CC" : timer.color }}
                      size="icon"
                      className="text-white rounded-full w-14 h-14 flex items-center justify-center shadow-md"
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
                  </TooltipTrigger>
                  <TooltipContent className="p-2 max-w-[260px] text-center">
                    {!timer.isEnabled 
                      ? "Timer is disabled. Enable it in settings."
                      : !timer.canPress 
                        ? (timer.lastPressed 
                            ? `Must wait ${formatTimeDuration(timer.minTime)} before next press. Tip: You can manually add presses by going to View History and using Quick Add.`
                            : `First press is ready! Click to start tracking.`)
                        : isUpdating
                          ? "Processing..." 
                          : "Press to record now"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        
        {/* Progress bar (only shown when display type is 'bar') */}
        {timer.displayType !== 'wheel' && (
          <Progress 
            value={timer.progress} 
            className="h-2 mt-2"
            indicatorStyle={{ 
              background: progressGradient,
              // Create a mask effect to reveal segments as progress advances
              clipPath: `inset(0 ${100 - timer.progress}% 0 0)`
            }}
          />
        )}
        
        {/* Min/Max Time Display */}
        <div className={`flex justify-between text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} ${timer.displayType === 'wheel' ? 'mt-2' : 'mt-1'}`}>
          <span>Min: {formatTimeDuration(timer.minTime, true)}</span>
          {timer.maxTime && (
            <span>Target: {formatTimeDuration(timer.maxTime, true)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
