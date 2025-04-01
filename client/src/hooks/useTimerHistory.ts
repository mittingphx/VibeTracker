import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { TimerHistory } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export interface UseTimerHistoryOptions {
  timerId: number;
  enabled?: boolean;
  dayStartHour?: number;
}

export function useTimerHistory({ timerId, enabled = true, dayStartHour = 0 }: UseTimerHistoryOptions) {
  // Fetch timer history for a specific timer
  const {
    data: history = [],
    isLoading,
    error
  } = useQuery<TimerHistory[]>({
    queryKey: ["/api/timers", timerId, "history"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/timers/${timerId}/history`);
      return response.json();
    },
    enabled: enabled && !!timerId
  });

  // Get the latest history entry for this timer
  const latestHistoryEntry = history.length > 0 
    ? history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    : null;
  
  // Check if there's any inactive history entry (for redo)
  const hasInactiveHistory = history.some(entry => !entry.isActive);
  
  // Mutation for undoing a timer press (set isActive to false)
  const { mutate: undoPress, isPending: isUndoing } = useMutation({
    mutationFn: async (historyId: number) => {
      const response = await apiRequest("PATCH", `/api/history/${historyId}`, { isActive: false });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timers", timerId, "history"] });
    },
  });

  // Mutation for redoing a timer press (set isActive to true)
  const { mutate: redoPress, isPending: isRedoing } = useMutation({
    mutationFn: async (historyId: number) => {
      const response = await apiRequest("PATCH", `/api/history/${historyId}`, { isActive: true });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timers", timerId, "history"] });
    },
  });

  // Undo the latest active entry
  const handleUndo = async () => {
    if (!latestHistoryEntry || !latestHistoryEntry.isActive) return;
    await undoPress(latestHistoryEntry.id);
  };

  // Redo the most recently undone entry
  const handleRedo = async () => {
    if (!hasInactiveHistory) return;
    
    // Find the latest inactive entry
    const latestInactive = history
      .filter(entry => !entry.isActive)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    if (latestInactive) {
      await redoPress(latestInactive.id);
    }
  };

  // Count presses for today (since the user-configured day start)
  const countPressesToday = (): number => {
    const now = new Date();
    const today = new Date();
    
    // Set to the day start hour for today
    today.setHours(dayStartHour, 0, 0, 0);
    
    // If current time is before the day start hour, use yesterday's day start
    if (now < today) {
      today.setDate(today.getDate() - 1);
    }

    return history.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= today && entry.isActive;
    }).length;
  };

  // Count active presses since a specific time of day
  const countPressesSinceTime = (hours: number, minutes: number = 0): number => {
    const now = new Date();
    const referenceTime = new Date();
    
    // Set to the specified time on the current day
    referenceTime.setHours(hours, minutes, 0, 0);
    
    // If the reference time is in the future, use the previous day
    if (referenceTime > now) {
      referenceTime.setDate(referenceTime.getDate() - 1);
    }
    
    return history.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= referenceTime && entry.isActive;
    }).length;
  };

  return {
    history,
    latestHistoryEntry,
    hasHistory: history.length > 0,
    canUndo: !!latestHistoryEntry?.isActive,
    canRedo: hasInactiveHistory,
    isLoading,
    isUndoing,
    isRedoing,
    error,
    undoPress,
    redoPress,
    handleUndo,
    handleRedo,
    countPressesToday,
    countPressesSinceTime
  };
}