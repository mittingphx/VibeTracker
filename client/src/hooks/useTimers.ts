import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { EnhancedTimer } from "@shared/schema";
import { useEffect, useState, useCallback, useRef } from "react";
import { calculateProgress } from "@/utils/timeUtils";

export function useTimers() {
  // Store the timers with client-side updates
  const [clientTimers, setClientTimers] = useState<EnhancedTimer[]>([]);
  // Keep track of the last time we fetched from the server
  const lastServerFetchRef = useRef<number>(Date.now());
  // Interval for client-side ticking
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get timers from server with much less frequent updates
  const {
    data: serverTimers = [],
    isLoading,
    error,
    refetch
  } = useQuery<EnhancedTimer[]>({
    queryKey: ["/api/timers"],
    refetchInterval: 60000, // Only refetch from server every 60 seconds
    refetchOnWindowFocus: true, // Refresh when tab becomes active
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Update client timers whenever server data changes
  useEffect(() => {
    if (serverTimers.length > 0) {
      setClientTimers(serverTimers);
      lastServerFetchRef.current = Date.now();
    }
  }, [serverTimers]);

  // Function to update client-side timers
  const updateClientTimers = useCallback(() => {
    setClientTimers(prevTimers => 
      prevTimers.map(timer => {
        // Skip update if timer has no last press time
        if (!timer.lastPressed) return timer;
        
        // Calculate new elapsed time
        const now = new Date();
        const lastPressedTime = new Date(timer.lastPressed).getTime();
        const elapsedSeconds = Math.floor((now.getTime() - lastPressedTime) / 1000);
        
        // Calculate progress
        const progress = calculateProgress(
          elapsedSeconds,
          timer.minTime,
          timer.maxTime
        );
        
        // Check if minimum time has passed
        const canPress = elapsedSeconds >= timer.minTime;
        
        // Return updated timer (only updating time-related fields)
        return {
          ...timer,
          elapsedTime: elapsedSeconds,
          progress,
          canPress
        };
      })
    );
  }, []);

  // Set up client-side ticking interval
  useEffect(() => {
    // Start the interval for client-side updates
    if (!tickIntervalRef.current) {
      tickIntervalRef.current = setInterval(() => {
        updateClientTimers();
        
        // Check if we need to fetch from server (after 60 seconds)
        const now = Date.now();
        if (now - lastServerFetchRef.current > 60000) {
          refetch();
          lastServerFetchRef.current = now;
        }
      }, 1000); // Update client-side every second
    }
    
    // Clean up interval on unmount
    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    };
  }, [updateClientTimers, refetch]);

  // Mutation for pressing a timer
  const { mutate: pressTimer, isPending: isPressing } = useMutation({
    mutationFn: async (timerId: number) => {
      const response = await apiRequest("POST", `/api/timers/${timerId}/press`);
      return response.json();
    },
    onSuccess: (newTimer) => {
      // Immediately update client-side with the response data
      setClientTimers(prevTimers => 
        prevTimers.map(timer => 
          timer.id === newTimer.id ? { ...newTimer, 
            // Calculate the client-side properties
            elapsedTime: 0,
            progress: 0,
            canPress: false
          } : timer
        )
      );
      // Also refresh the server data
      refetch();
    },
  });

  // Mutation for creating a new timer
  const { mutate: createTimer, isPending: isCreating } = useMutation({
    mutationFn: async (timerData: any) => {
      const response = await apiRequest("POST", "/api/timers", timerData);
      return response.json();
    },
    onSuccess: () => {
      // After creating a timer, get fresh data from server
      refetch();
    },
  });

  // Mutation for updating a timer
  const { mutate: updateTimer, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/timers/${id}`, data);
      return response.json();
    },
    onSuccess: (updatedTimer) => {
      // Update the client-side timers with the updated timer
      setClientTimers(prevTimers => 
        prevTimers.map(timer => 
          timer.id === updatedTimer.id ? {
            ...updatedTimer,
            // Preserve calculated properties
            elapsedTime: timer.elapsedTime,
            progress: calculateProgress(
              timer.elapsedTime,
              updatedTimer.minTime,
              updatedTimer.maxTime
            ),
            canPress: timer.elapsedTime >= updatedTimer.minTime
          } : timer
        )
      );
      // Also refresh server data
      refetch();
    },
  });

  // Mutation for deleting a timer
  const { mutate: deleteTimer, isPending: isDeleting } = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/timers/${id}`);
    },
    onSuccess: (_, deletedId) => {
      // Remove the deleted timer from client-side state
      setClientTimers(prevTimers => 
        prevTimers.filter(timer => timer.id !== deletedId)
      );
      // Also refresh server data
      refetch();
    },
  });
  
  // Mutation for archiving a timer
  const { mutate: archiveTimer, isPending: isArchiving } = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/timers/${id}/archive`, {});
      return response.json();
    },
    onSuccess: (archivedTimer) => {
      // Remove the archived timer from client-side active timers
      setClientTimers(prevTimers => 
        prevTimers.filter(timer => timer.id !== archivedTimer.id)
      );
      // Refresh server data and archived timers
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/timers/archived"] });
    },
  });
  
  // Mutation for restoring a timer from archive
  const { mutate: restoreTimer, isPending: isRestoring } = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/timers/${id}/restore`, {});
      return response.json();
    },
    onSuccess: () => {
      // Refresh both active and archived timers from server
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/timers/archived"] });
    },
  });
  
  // Query for archived timers - keep this as-is since archived timers don't need frequent updates
  const {
    data: archivedTimers = [],
    isLoading: isLoadingArchived,
    error: archivedError
  } = useQuery<EnhancedTimer[]>({
    queryKey: ["/api/timers/archived"],
    enabled: false, // Only load when needed
  });

  return {
    timers: clientTimers, // Return client-side timers with calculated updates
    archivedTimers,
    isLoading,
    isLoadingArchived,
    error,
    archivedError,
    isPressing,
    isCreating,
    isUpdating,
    isDeleting,
    isArchiving,
    isRestoring,
    pressTimer,
    createTimer,
    updateTimer,
    deleteTimer,
    archiveTimer,
    restoreTimer,
  };
}
