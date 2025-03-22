import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { TimerHistory } from "@shared/schema";

export interface UseTimerHistoryOptions {
  timerId: number;
  enabled?: boolean;
}

export function useTimerHistory({ timerId, enabled = true }: UseTimerHistoryOptions) {
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
    handleRedo
  };
}