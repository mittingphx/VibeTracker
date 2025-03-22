import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { EnhancedTimer } from "@shared/schema";

export function useTimers() {
  const {
    data: timers = [],
    isLoading,
    error
  } = useQuery<EnhancedTimer[]>({
    queryKey: ["/api/timers"],
    refetchInterval: 1000, // Refetch every second to update elapsed time
  });

  // Mutation for pressing a timer
  const { mutate: pressTimer, isPending: isPressing } = useMutation({
    mutationFn: async (timerId: number) => {
      const response = await apiRequest("POST", `/api/timers/${timerId}/press`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
    },
  });

  // Mutation for creating a new timer
  const { mutate: createTimer, isPending: isCreating } = useMutation({
    mutationFn: async (timerData: any) => {
      const response = await apiRequest("POST", "/api/timers", timerData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
    },
  });

  // Mutation for updating a timer
  const { mutate: updateTimer, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/timers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
    },
  });

  // Mutation for deleting a timer
  const { mutate: deleteTimer, isPending: isDeleting } = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/timers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
    },
  });
  
  // Mutation for archiving a timer
  const { mutate: archiveTimer, isPending: isArchiving } = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/timers/${id}/archive`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
    },
  });
  
  // Mutation for restoring a timer from archive
  const { mutate: restoreTimer, isPending: isRestoring } = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/timers/${id}/restore`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timers/archived"] });
    },
  });
  
  // Query for archived timers
  const {
    data: archivedTimers = [],
    isLoading: isLoadingArchived,
    error: archivedError
  } = useQuery<EnhancedTimer[]>({
    queryKey: ["/api/timers/archived"],
    enabled: false, // Only load when needed to avoid unnecessary requests
  });

  return {
    timers,
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
