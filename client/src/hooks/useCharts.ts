import { useQuery } from "@tanstack/react-query";
import { formatISO } from "date-fns";
import { TimerHistory } from "@shared/schema";

interface ChartDataPoint {
  timestamp: string;
  timerId: number;
  count: number;
}

interface UseChartsOptions {
  period: "daily" | "weekly";
  currentStart: Date;
  currentEnd: Date;
  comparisonStart: Date;
  comparisonEnd: Date;
  selectedTimerIds: number[];
}

interface ProcessedHistoryData {
  currentPeriodData: ChartDataPoint[];
  comparisonPeriodData: ChartDataPoint[];
  isLoading: boolean;
  error: unknown;
}

export function useCharts({
  period,
  currentStart,
  currentEnd,
  comparisonStart,
  comparisonEnd,
  selectedTimerIds,
}: UseChartsOptions): ProcessedHistoryData {
  // Query for current period data
  const currentPeriodQuery = useQuery<TimerHistory[]>({
    queryKey: [
      "/api/history",
      formatISO(currentStart),
      formatISO(currentEnd),
    ],
    queryFn: async ({ queryKey }) => {
      // Convert ISO strings back to date strings for the API
      const response = await fetch(
        `/api/history?startDate=${queryKey[1]}&endDate=${queryKey[2]}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch current period data");
      }
      return response.json();
    },
    enabled: selectedTimerIds.length > 0,
  });

  // Query for comparison period data
  const comparisonPeriodQuery = useQuery<TimerHistory[]>({
    queryKey: [
      "/api/history",
      formatISO(comparisonStart),
      formatISO(comparisonEnd),
    ],
    queryFn: async ({ queryKey }) => {
      // Convert ISO strings back to date strings for the API
      const response = await fetch(
        `/api/history?startDate=${queryKey[1]}&endDate=${queryKey[2]}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch comparison period data");
      }
      return response.json();
    },
    enabled: selectedTimerIds.length > 0,
  });

  // Process data for the chart
  const processHistoryData = (
    history: TimerHistory[] | undefined,
    isPeriodCurrent: boolean
  ): ChartDataPoint[] => {
    if (!history || history.length === 0) return [];

    // Filter history for selected timers
    const filteredHistory = history.filter(entry => 
      selectedTimerIds.includes(entry.timerId)
    );

    // Group history entries by hour (for daily view) or day (for weekly view) and timer
    const groupedData: Record<string, Record<number, number>> = {};

    filteredHistory.forEach(entry => {
      const date = new Date(entry.timestamp);
      // Format based on period
      const timeKey = period === "daily" 
        ? `${date.getHours()}:00` 
        : date.toLocaleDateString("en-US", { weekday: "short" });
      
      // Initialize group if it doesn't exist
      if (!groupedData[timeKey]) {
        groupedData[timeKey] = {};
      }
      
      // Initialize timer count if it doesn't exist
      if (!groupedData[timeKey][entry.timerId]) {
        groupedData[timeKey][entry.timerId] = 0;
      }
      
      // Increment count
      groupedData[timeKey][entry.timerId] += 1;
    });

    // Convert grouped data to chart points
    const chartPoints: ChartDataPoint[] = [];
    
    Object.entries(groupedData).forEach(([timeKey, timerCounts]) => {
      Object.entries(timerCounts).forEach(([timerIdStr, count]) => {
        const timerId = parseInt(timerIdStr);
        
        chartPoints.push({
          timestamp: timeKey,
          timerId,
          count,
          // Add a period indicator to distinguish current vs comparison data
          ...(isPeriodCurrent ? { period: "current" } : { period: "comparison" }),
        });
      });
    });

    return chartPoints;
  };

  return {
    currentPeriodData: processHistoryData(currentPeriodQuery.data, true),
    comparisonPeriodData: processHistoryData(comparisonPeriodQuery.data, false),
    isLoading: currentPeriodQuery.isLoading || comparisonPeriodQuery.isLoading,
    error: currentPeriodQuery.error || comparisonPeriodQuery.error,
  };
}
