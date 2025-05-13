import { useQuery } from "@tanstack/react-query";
import { formatISO, format, differenceInMinutes, startOfDay, isSameDay } from "date-fns";
import { TimerHistory } from "@shared/schema";

// Chart data point for count-based charts (number of presses per time period)
interface CountChartDataPoint {
  timestamp: string;
  timerId: number;
  count: number;
}

// Chart data point for average time between presses
interface AverageTimeChartDataPoint {
  date: string; // formatted date string (e.g. "2023-03-21")
  timerId: number;
  averageMinutes: number;
}

// Chart data point for individual press events
interface PressEventChartDataPoint {
  timestamp: Date; // actual date object for the x-axis
  timerId: number;
  minutesSinceLast: number;
}

// Table view data type - this represents the raw timer history records
interface TableViewData {
  id: number;
  timerId: number;
  timestamp: string;
  isActive: boolean;
}

interface UseChartsOptions {
  period: "daily" | "weekly" | "monthly";
  currentStart: Date;
  currentEnd: Date;
  comparisonStart: Date;
  comparisonEnd: Date;
  selectedTimerIds: number[];
}

interface UseTableDataOptions {
  startDate: Date;
  endDate: Date;
  selectedTimerIds: number[];
}

interface ProcessedHistoryData {
  // Original data
  currentPeriodData: CountChartDataPoint[];
  comparisonPeriodData: CountChartDataPoint[];
  
  // New chart data types
  averageTimeBetweenPresses: AverageTimeChartDataPoint[];
  pressEvents: PressEventChartDataPoint[];
  
  isLoading: boolean;
  error: unknown;
}

export function useTableData({
  startDate,
  endDate,
  selectedTimerIds,
}: UseTableDataOptions) {
  // Query for table data within the specified date range
  const tableDataQuery = useQuery<TimerHistory[]>({
    queryKey: [
      "/api/history",
      formatISO(startDate),
      formatISO(endDate),
      "table",
      selectedTimerIds.join(",")
    ],
    queryFn: async ({ queryKey }) => {
      // Convert ISO strings back to date strings for the API
      const response = await fetch(
        `/api/history?startDate=${queryKey[1]}&endDate=${queryKey[2]}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch table data");
      }
      return response.json();
    },
    enabled: selectedTimerIds.length > 0,
  });
  
  // Filter the results to only include selected timers and active records
  // Sort by timestamp descending (newest first)
  const tableData = tableDataQuery.data 
    ? tableDataQuery.data
        .filter(entry => 
          selectedTimerIds.includes(entry.timerId) && entry.isActive
        )
        .sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
    : [];
  
  return {
    tableData,
    isLoading: tableDataQuery.isLoading,
    error: tableDataQuery.error
  };
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
  
  // Get the raw history data for the table view (combined data for the current period)
  const rawHistoryData = currentPeriodQuery.data 
    ? currentPeriodQuery.data.filter(entry => 
        selectedTimerIds.includes(entry.timerId) && entry.isActive
      ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  // Process data for the count-based chart (original functionality)
  const processCountHistoryData = (
    history: TimerHistory[] | undefined,
    isPeriodCurrent: boolean
  ): CountChartDataPoint[] => {
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
      let timeKey;
      if (period === "daily") {
        timeKey = `${date.getHours()}:00`;
      } else if (period === "weekly") {
        timeKey = date.toLocaleDateString("en-US", { weekday: "short" });
      } else { // monthly
        timeKey = format(date, "dd"); // Day of month
      }
      
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
    const chartPoints: CountChartDataPoint[] = [];
    
    Object.entries(groupedData).forEach(([timeKey, timerCounts]) => {
      Object.entries(timerCounts).forEach(([timerIdStr, count]) => {
        const timerId = parseInt(timerIdStr);
        
        chartPoints.push({
          timestamp: timeKey,
          timerId,
          count,
        });
      });
    });

    return chartPoints;
  };

  // Process data for average time between presses by day
  const processAverageTimeData = (
    history: TimerHistory[] | undefined
  ): AverageTimeChartDataPoint[] => {
    if (!history || history.length === 0) return [];

    // Filter history for selected timers and make sure it's active records
    const filteredHistory = history
      .filter(entry => selectedTimerIds.includes(entry.timerId) && entry.isActive)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Group history by timer ID and day
    const timerDayGroups: Record<number, Record<string, Date[]>> = {};
    
    filteredHistory.forEach(entry => {
      const timerId = entry.timerId;
      const date = new Date(entry.timestamp);
      const dayKey = format(date, 'yyyy-MM-dd');
      
      // Initialize timer group if it doesn't exist
      if (!timerDayGroups[timerId]) {
        timerDayGroups[timerId] = {};
      }
      
      // Initialize day group if it doesn't exist
      if (!timerDayGroups[timerId][dayKey]) {
        timerDayGroups[timerId][dayKey] = [];
      }
      
      // Add timestamp to the day group
      timerDayGroups[timerId][dayKey].push(date);
    });
    
    // Calculate average time between presses for each day and timer
    const averageTimePoints: AverageTimeChartDataPoint[] = [];
    
    Object.entries(timerDayGroups).forEach(([timerIdStr, dayGroups]) => {
      const timerId = parseInt(timerIdStr);
      
      Object.entries(dayGroups).forEach(([dayKey, timestamps]) => {
        // Need at least 2 timestamps to calculate time between presses
        if (timestamps.length < 2) return;
        
        let totalMinutes = 0;
        let count = 0;
        
        // Calculate time differences between consecutive timestamps
        for (let i = 1; i < timestamps.length; i++) {
          const minutesDiff = differenceInMinutes(timestamps[i], timestamps[i-1]);
          totalMinutes += minutesDiff;
          count++;
        }
        
        if (count > 0) {
          averageTimePoints.push({
            date: dayKey,
            timerId,
            averageMinutes: Math.round(totalMinutes / count)
          });
        }
      });
    });
    
    return averageTimePoints;
  };
  
  // Process data for individual press events with minutes since last
  const processPressEventData = (
    history: TimerHistory[] | undefined
  ): PressEventChartDataPoint[] => {
    if (!history || history.length === 0) return [];
    
    // Filter history for selected timers and make sure it's active records
    const filteredHistory = history
      .filter(entry => selectedTimerIds.includes(entry.timerId) && entry.isActive);
    
    // Group by timer ID
    const timerGroups: Record<number, TimerHistory[]> = {};
    
    filteredHistory.forEach(entry => {
      if (!timerGroups[entry.timerId]) {
        timerGroups[entry.timerId] = [];
      }
      timerGroups[entry.timerId].push(entry);
    });
    
    // Process each timer group to calculate minutes since last press
    const pressEventPoints: PressEventChartDataPoint[] = [];
    
    Object.entries(timerGroups).forEach(([timerIdStr, entries]) => {
      const timerId = parseInt(timerIdStr);
      
      // Sort entries by timestamp (ascending)
      const sortedEntries = [...entries].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Calculate minutes since last press for each entry
      for (let i = 1; i < sortedEntries.length; i++) {
        const currentTime = new Date(sortedEntries[i].timestamp);
        const previousTime = new Date(sortedEntries[i-1].timestamp);
        const minutesSinceLast = differenceInMinutes(currentTime, previousTime);
        
        pressEventPoints.push({
          timestamp: currentTime,
          timerId,
          minutesSinceLast
        });
      }
    });
    
    return pressEventPoints;
  };

  // Combine current and comparison period data for processing
  const allHistory = [
    ...(currentPeriodQuery.data || []),
    ...(comparisonPeriodQuery.data || [])
  ];
  
  return {
    // Original data format
    currentPeriodData: processCountHistoryData(currentPeriodQuery.data, true),
    comparisonPeriodData: processCountHistoryData(comparisonPeriodQuery.data, false),
    
    // New chart data formats
    averageTimeBetweenPresses: processAverageTimeData(allHistory),
    pressEvents: processPressEventData(allHistory),
    
    isLoading: currentPeriodQuery.isLoading || comparisonPeriodQuery.isLoading,
    error: currentPeriodQuery.error || comparisonPeriodQuery.error,
  };
}
