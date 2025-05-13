import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  CalendarIcon, Calendar as CalendarIcon2, CalendarDays, BarChart, BarChart2, 
  TrendingUp, Clock, X, Table2, Download, ChevronDown, Filter
} from "lucide-react";
import { useCharts, useTableData } from "@/hooks/useCharts";
import { useTimers } from "@/hooks/useTimers";
import { getThemePreference } from "@/lib/themeUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  VictoryChart,
  VictoryBar,
  VictoryScatter,
  VictoryLine,
  VictoryAxis,
  VictoryTheme,
  VictoryStack,
  VictoryLegend,
  VictoryTooltip,
} from "victory";
import { 
  format, subDays, startOfDay, startOfWeek, endOfWeek, subWeeks, 
  subMonths, startOfMonth, endOfMonth, parseISO, addDays 
} from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChartViewProps {
  onClose: () => void;
}

type ChartMode = "today" | "compare";
type ChartPeriod = "daily" | "weekly" | "monthly";
type ChartType = "count" | "average" | "events" | "table";
type TimelinePeriod = "daily" | "weekly" | "monthly";
type DateRangeOption = "today" | "yesterday" | "last7days" | "last30days" | "custom";

export default function ChartView({ onClose }: ChartViewProps) {
  const isMobile = useIsMobile();
  const { timers } = useTimers();
  const [chartMode, setChartMode] = useState<ChartMode>("today");
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("daily");
  const [chartType, setChartType] = useState<ChartType>("count");
  
  // Table view state
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>("last7days");
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 7));
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  
  // Helper functions for the table view
  const getDateRangeLabel = (option: DateRangeOption): string => {
    switch (option) {
      case "today": return "Today";
      case "yesterday": return "Yesterday";
      case "last7days": return "Last 7 Days";
      case "last30days": return "Last 30 Days";
      case "custom": return "Custom Range";
      default: return "Select Range";
    }
  };
  
  // Calculate the actual date range based on selected option
  const getDateRangeForOption = (option: DateRangeOption): { start: Date; end: Date } => {
    const today = new Date();
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    
    switch (option) {
      case "today":
        return { 
          start: startOfDay(today), 
          end: endOfToday 
        };
      case "yesterday":
        const yesterday = subDays(today, 1);
        return { 
          start: startOfDay(yesterday), 
          end: new Date(startOfDay(yesterday).getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      case "last7days":
        return { 
          start: startOfDay(subDays(today, 6)), 
          end: endOfToday 
        };
      case "last30days":
        return { 
          start: startOfDay(subDays(today, 29)), 
          end: endOfToday 
        };
      case "custom":
        return { 
          start: startOfDay(customStartDate), 
          end: new Date(startOfDay(customEndDate).getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      default:
        return { 
          start: startOfDay(subDays(today, 6)), 
          end: endOfToday 
        };
    }
  };
  
  // Generate CSV content from timer history data
  const generateCSV = (timerHistory: any[], timers: any[]): string => {
    // Create header row
    let csv = "Timer,Label,Timestamp,Date,Time\n";
    
    // Create data rows
    timerHistory.forEach(entry => {
      const timer = timers.find(t => t.id === entry.timerId) || { label: "Unknown" };
      const timestamp = new Date(entry.timestamp);
      const date = format(timestamp, "yyyy-MM-dd");
      const time = format(timestamp, "HH:mm:ss");
      
      csv += `${entry.timerId},"${timer.label.replace(/"/g, '""')}","${entry.timestamp}","${date}","${time}"\n`;
    });
    
    return csv;
  };
  
  // Function to trigger CSV download
  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Track which timers are selected for chart display
  // Use localStorage to persist selection between sessions
  const [selectedTimerIds, setSelectedTimerIds] = useState<number[]>(() => {
    // Try to load from localStorage first
    const savedSelection = localStorage.getItem('chartSelectedTimers');
    
    if (savedSelection) {
      try {
        const parsedSelection = JSON.parse(savedSelection);
        // Make sure all currently available timers are included by default
        const allCurrentTimerIds = timers.map(timer => timer.id);
        // Merge saved selection with any new timers that weren't in the saved selection
        return Array.from(new Set([...parsedSelection, ...allCurrentTimerIds]));
      } catch (e) {
        // If parsing fails, default to all timers
        return timers.map(timer => timer.id);
      }
    } else {
      // Default: select all timers
      return timers.map(timer => timer.id);
    }
  });

  // Handle toggling a timer selection
  const toggleTimerSelection = (timerId: number) => {
    if (selectedTimerIds.includes(timerId)) {
      const newSelection = selectedTimerIds.filter(id => id !== timerId);
      setSelectedTimerIds(newSelection);
      // Save to localStorage
      localStorage.setItem('chartSelectedTimers', JSON.stringify(newSelection));
    } else {
      const newSelection = [...selectedTimerIds, timerId];
      setSelectedTimerIds(newSelection);
      // Save to localStorage
      localStorage.setItem('chartSelectedTimers', JSON.stringify(newSelection));
    }
  };

  // Calculate date ranges based on chart mode and period
  const currentDate = startOfDay(new Date());
  
  // Get start and end dates based on period and current selection
  let currentStart, currentEnd, comparisonStart, comparisonEnd;
  
  // For table view, use the selected date range
  // Initialize with defaults in case chart type is not table
  const dateRange = getDateRangeForOption(dateRangeOption);
  const tableStart = dateRange.start;
  const tableEnd = dateRange.end;
  
  if (chartPeriod === "daily") {
    // Daily view: today vs yesterday
    currentStart = currentDate;
    currentEnd = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000 - 1);  // End of today
    comparisonStart = startOfDay(subDays(currentDate, 1));  // Yesterday
    comparisonEnd = new Date(comparisonStart.getTime() + 24 * 60 * 60 * 1000 - 1);  // End of yesterday
  } else if (chartPeriod === "weekly") {
    // Weekly view: this week vs last week
    currentStart = startOfWeek(currentDate, { weekStartsOn: 1 });  // Monday
    currentEnd = endOfWeek(currentDate, { weekStartsOn: 1 });  // Sunday
    comparisonStart = startOfWeek(subWeeks(currentDate, 1), { weekStartsOn: 1 });  // Last week Monday
    comparisonEnd = endOfWeek(subWeeks(currentDate, 1), { weekStartsOn: 1 });  // Last week Sunday
  } else {
    // Monthly view: this month vs last month
    currentStart = startOfMonth(currentDate);
    currentEnd = endOfMonth(currentDate);
    comparisonStart = startOfMonth(subMonths(currentDate, 1));
    comparisonEnd = endOfMonth(subMonths(currentDate, 1));
  }

  // Fetch chart data based on selected period
  const { currentPeriodData, comparisonPeriodData, averageTimeBetweenPresses, pressEvents, isLoading, error } = useCharts({
    period: chartPeriod,
    currentStart,
    currentEnd,
    comparisonStart,
    comparisonEnd,
    selectedTimerIds,
  });
  
  // Fetch table data separately for the table view
  const { tableData, isLoading: isTableLoading, error: tableError } = useTableData({
    startDate: tableStart,
    endDate: tableEnd,
    selectedTimerIds,
  });

  // Combine data for comparison if needed
  const countChartData = chartMode === "today" 
    ? currentPeriodData
    : [...currentPeriodData, ...comparisonPeriodData];

  // Check if there is data for the selected period
  const hasData = countChartData.length > 0;

  // Define a set of distinct high-contrast colors for charts
  const distinctChartColors = [
    "#1E88E5", // Blue
    "#D81B60", // Pink
    "#FFC107", // Amber
    "#004D40", // Teal
    "#9C27B0", // Purple
    "#FF5722", // Deep Orange
    "#43A047", // Green
    "#795548", // Brown
    "#607D8B", // Blue Grey
    "#F57F17", // Dark Amber
    "#00B0FF", // Light Blue
    "#76FF03", // Light Green
  ];
  
  // Function to assign a distinct chart color for each timer
  // This ensures each timer has a different color in the charts, even if the original timer color is similar
  const getChartColorForTimer = (index: number) => {
    return distinctChartColors[index % distinctChartColors.length];
  };
  
  const getTimerById = (id: number) => {
    return timers.find(timer => timer.id === id) || { color: "#ccc", label: "Unknown" };
  };

  // Get theme preference
  const isDarkMode = getThemePreference();
  
  // Set chart theme based on dark mode
  const chartTheme = isDarkMode ? {
    ...VictoryTheme.material,
    axis: {
      style: {
        grid: { stroke: "rgba(255, 255, 255, 0.1)" },
        tickLabels: { fill: "rgba(255, 255, 255, 0.8)" },
        axisLabel: { fill: "white" }
      }
    }
  } : VictoryTheme.material;
  
  return (
    <div className={`${isMobile ? 'mobile-popup-position' : 'fixed inset-0 bg-black/50 backdrop-blur-sm z-20 flex justify-center items-center p-4'}`}>
      <div className={`flex flex-col w-full ${isMobile ? 'h-full' : 'max-w-2xl shadow-2xl h-[95vh] rounded-xl'} ${isDarkMode ? 'bg-gray-900' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        {/* Fixed Header - Always visible */}
        <div className={`flex justify-between items-center p-4 border-b ${isDarkMode ? 'bg-blue-900/80 border-gray-700' : 'bg-blue-200 border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <h1 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Charts</h1>
            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${isDarkMode ? 'bg-blue-900/30 text-blue-200 border border-blue-800' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 mr-1">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Work in Progress
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Fixed Chart Type Selector - Always visible */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Tabs defaultValue="count" className="w-full" onValueChange={(value) => setChartType(value as ChartType)}>
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="count">Count</TabsTrigger>
              <TabsTrigger value="average">Average Time</TabsTrigger>
              <TabsTrigger value="events">Timeline</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {chartType === "count" && "Number of presses per day"}
            {chartType === "average" && "Average minutes between presses"}
            {chartType === "events" && "Timeline of press events"}
            {chartType === "table" && "Detailed press history table"}
          </div>
        </div>
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto">
        
          {/* Chart Mode Selector */}
          {chartType === "count" && (
            <div className="px-4 mb-2 flex">
              <Button
                variant="ghost"
                className={`px-2 ${
                  chartMode === "today" 
                    ? "text-blue-500 border-b-2 border-blue-500" 
                    : isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
                onClick={() => setChartMode("today")}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Current
              </Button>
              <Button
                variant="ghost"
                className={`px-2 ${
                  chartMode === "compare" 
                    ? "text-blue-500 border-b-2 border-blue-500" 
                    : isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
                onClick={() => setChartMode("compare")}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Compare
              </Button>
            </div>
          )}
          
          {/* Chart Period Selector for Count and Average */}
          {(chartType === "count" || chartType === "average") && (
            <div className="px-4 mb-4 flex">
              <Button
                variant="ghost"
                className={`px-2 ${
                  chartPeriod === "daily" 
                    ? "text-blue-500 border-b-2 border-blue-500" 
                    : isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
                onClick={() => setChartPeriod("daily")}
              >
                <BarChart className="h-4 w-4 mr-2" />
                Daily
              </Button>
              <Button
                variant="ghost"
                className={`px-2 ${
                  chartPeriod === "weekly" 
                    ? "text-blue-500 border-b-2 border-blue-500" 
                    : isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
                onClick={() => setChartPeriod("weekly")}
              >
                <BarChart2 className="h-4 w-4 mr-2" />
                Weekly
              </Button>
              <Button
                variant="ghost"
                className={`px-2 ${
                  chartPeriod === "monthly" 
                    ? "text-blue-500 border-b-2 border-blue-500" 
                    : isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
                onClick={() => setChartPeriod("monthly")}
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Monthly
              </Button>
            </div>
          )}
          
          {/* Timeline Period Selector */}
          {chartType === "events" && (
            <div className="px-4 mb-4 flex">
              <Button
                variant="ghost"
                className={`px-2 ${
                  chartPeriod === "daily" 
                    ? "text-blue-500 border-b-2 border-blue-500" 
                    : isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
                onClick={() => setChartPeriod("daily")}
              >
                <Clock className="h-4 w-4 mr-2" />
                Daily
              </Button>
              <Button
                variant="ghost"
                className={`px-2 ${
                  chartPeriod === "weekly" 
                    ? "text-blue-500 border-b-2 border-blue-500" 
                    : isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
                onClick={() => setChartPeriod("weekly")}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Weekly
              </Button>
              <Button
                variant="ghost"
                className={`px-2 ${
                  chartPeriod === "monthly" 
                    ? "text-blue-500 border-b-2 border-blue-500" 
                    : isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
                onClick={() => setChartPeriod("monthly")}
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Monthly
              </Button>
            </div>
          )}
          
          {/* Chart Display */}
          <div className={`mx-4 mb-4 border rounded-xl p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
              </div>
            ) : error ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center px-6">
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Failed to load chart data</p>
                </div>
              </div>
            ) : (
              <>
                {/* Count Chart - Number of presses per time period */}
                {chartType === "count" && (
                  countChartData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center px-6">
                        <CalendarIcon className={`h-16 w-16 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mx-auto mb-3`} />
                        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>No count data available for the selected period</p>
                      </div>
                    </div>
                  ) : (
                    <VictoryChart
                      theme={chartTheme}
                      domainPadding={20}
                      height={250}
                    >
                      <VictoryLegend
                        x={50}
                        y={0}
                        centerTitle
                        orientation="horizontal"
                        style={{
                          labels: { fill: isDarkMode ? "white" : undefined }
                        }}
                        data={
                          timers
                            .filter(timer => selectedTimerIds.includes(timer.id))
                            .map((timer, index) => ({
                              name: timer.label,
                              symbol: { fill: getChartColorForTimer(index) }
                            }))
                        }
                      />
                      <VictoryAxis
                        tickFormat={x => x}
                        style={{
                          tickLabels: { fill: isDarkMode ? "white" : undefined }
                        }}
                      />
                      <VictoryAxis
                        dependentAxis
                        tickFormat={x => `${x}x`}
                        style={{
                          tickLabels: { fill: isDarkMode ? "white" : undefined }
                        }}
                      />
                      <VictoryStack>
                        {timers
                          .filter(timer => selectedTimerIds.includes(timer.id))
                          .map((timer, index) => (
                            <VictoryBar
                              key={timer.id}
                              data={countChartData.filter(d => d.timerId === timer.id)}
                              x="timestamp"
                              y="count"
                              style={{ data: { fill: getChartColorForTimer(index) } }}
                            />
                          ))}
                      </VictoryStack>
                    </VictoryChart>
                  )
                )}
                
                {/* Average Time Chart - Squares with average minutes between presses */}
                {chartType === "average" && (
                  averageTimeBetweenPresses.length === 0 ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center px-6">
                        <TrendingUp className={`h-16 w-16 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mx-auto mb-3`} />
                        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>No average time data available. Needs at least two presses per timer.</p>
                      </div>
                    </div>
                  ) : (
                    <VictoryChart
                      theme={chartTheme}
                      domainPadding={20}
                      height={300}
                    >
                      <VictoryLegend
                        x={50}
                        y={0}
                        centerTitle
                        orientation="horizontal"
                        style={{
                          labels: { fill: isDarkMode ? "white" : undefined }
                        }}
                        data={
                          timers
                            .filter(timer => selectedTimerIds.includes(timer.id))
                            .map((timer, index) => ({
                              name: timer.label,
                              symbol: { fill: getChartColorForTimer(index) }
                            }))
                        }
                      />
                      <VictoryAxis
                        tickFormat={(x) => x}
                        label="Date"
                        style={{
                          axisLabel: { padding: 30, fill: isDarkMode ? "white" : undefined },
                          tickLabels: { fill: isDarkMode ? "white" : undefined }
                        }}
                      />
                      <VictoryAxis
                        dependentAxis
                        label="Average Minutes"
                        style={{
                          axisLabel: { padding: 40, fill: isDarkMode ? "white" : undefined },
                          tickLabels: { fill: isDarkMode ? "white" : undefined }
                        }}
                      />
                      {timers
                        .filter(timer => selectedTimerIds.includes(timer.id))
                        .map((timer, index) => (
                          <VictoryScatter
                            key={timer.id}
                            data={averageTimeBetweenPresses.filter(d => d.timerId === timer.id)}
                            x="date"
                            y="averageMinutes"
                            size={8}
                            style={{ 
                              data: { 
                                fill: getChartColorForTimer(index),
                                stroke: isDarkMode ? "#333" : "white",
                                strokeWidth: 1
                              }
                            }}
                            symbol="square"
                            labelComponent={
                              <VictoryTooltip
                                flyoutStyle={{ 
                                  fill: isDarkMode ? "#333" : "white", 
                                  stroke: isDarkMode ? "#555" : "#ccc" 
                                }}
                                style={{ fill: isDarkMode ? "white" : "black" }}
                              />
                            }
                            labels={({ datum }) => `${timer.label}\n${datum.date}\nAvg: ${datum.averageMinutes} min`}
                          />
                        ))}
                    </VictoryChart>
                  )
                )}
                
                {/* Events Timeline Chart - Minutes since last press for each event */}
                {chartType === "events" && (
                  pressEvents.length === 0 ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center px-6">
                        <Clock className={`h-16 w-16 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mx-auto mb-3`} />
                        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>No timeline data available. Need at least two presses per timer.</p>
                      </div>
                    </div>
                  ) : (
                    <VictoryChart
                      theme={chartTheme}
                      domainPadding={20}
                      height={300}
                      scale={{ x: "time" }}
                    >
                      <VictoryLegend
                        x={50}
                        y={0}
                        centerTitle
                        orientation="horizontal"
                        style={{
                          labels: { fill: isDarkMode ? "white" : undefined }
                        }}
                        data={
                          timers
                            .filter(timer => selectedTimerIds.includes(timer.id))
                            .map((timer, index) => ({
                              name: timer.label,
                              symbol: { fill: getChartColorForTimer(index) }
                            }))
                        }
                      />
                      <VictoryAxis
                        tickFormat={(x) => {
                          const date = new Date(x);
                          if (chartPeriod === "daily") {
                            return format(date, "HH:mm"); // Hours and minutes only for daily view
                          } else if (chartPeriod === "weekly") {
                            return format(date, "MM/dd HH:mm"); // Date and time for weekly view
                          } else {
                            return format(date, "MM/dd"); // Just the date for monthly view (avoid crowding)
                          }
                        }}
                        label="Date and Time"
                        style={{
                          axisLabel: { padding: 30, fill: isDarkMode ? "white" : undefined },
                          tickLabels: { fill: isDarkMode ? "white" : undefined }
                        }}
                      />
                      <VictoryAxis
                        dependentAxis
                        label="Minutes Since Last Press"
                        style={{
                          axisLabel: { padding: 40, fill: isDarkMode ? "white" : undefined },
                          tickLabels: { fill: isDarkMode ? "white" : undefined }
                        }}
                      />
                      {/* Render all lines first, then all scatter points */}
                      {timers
                        .filter(timer => selectedTimerIds.includes(timer.id))
                        .map((timer, index) => (
                          <VictoryLine
                            key={`line-${timer.id}`}
                            data={pressEvents.filter(d => d.timerId === timer.id)}
                            x="timestamp"
                            y="minutesSinceLast"
                            style={{
                              data: { stroke: getChartColorForTimer(index), strokeOpacity: 0.5, strokeWidth: 2 }
                            }}
                          />
                        ))}
                      
                      {timers
                        .filter(timer => selectedTimerIds.includes(timer.id))
                        .map((timer, index) => (
                          <VictoryScatter
                            key={`scatter-${timer.id}`}
                            data={pressEvents.filter(d => d.timerId === timer.id)}
                            x="timestamp"
                            y="minutesSinceLast"
                            size={5}
                            style={{ data: { fill: getChartColorForTimer(index) } }}
                            labelComponent={
                              <VictoryTooltip
                                flyoutStyle={{ 
                                  fill: isDarkMode ? "#333" : "white", 
                                  stroke: isDarkMode ? "#555" : "#ccc" 
                                }}
                                style={{ fill: isDarkMode ? "white" : "black" }}
                              />
                            }
                            labels={({ datum }) => 
                              `${timer.label}\n${format(new Date(datum.timestamp), "MM/dd/yyyy HH:mm")}\n${datum.minutesSinceLast} min since last`
                            }
                          />
                        ))}
                    </VictoryChart>
                  )
                )}
                
                {/* Table View for Timer History */}
                {chartType === "table" && (
                  <>
                    {/* Date Range Selector */}
                    <div className="px-4 mb-6">
                      <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <div className="flex-1">
                          <div className="mb-2 text-sm font-medium">Date Range</div>
                          <Select
                            value={dateRangeOption}
                            onValueChange={(value) => setDateRangeOption(value as DateRangeOption)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select date range" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="today">Today</SelectItem>
                              <SelectItem value="yesterday">Yesterday</SelectItem>
                              <SelectItem value="last7days">Last 7 days</SelectItem>
                              <SelectItem value="last30days">Last 30 days</SelectItem>
                              <SelectItem value="custom">Custom range</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {dateRangeOption === "custom" && (
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <div className="mb-2 text-sm font-medium">Start Date</div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {customStartDate ? format(customStartDate, "PPP") : "Select date"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={customStartDate}
                                    onSelect={(date) => date && setCustomStartDate(date)}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            
                            <div className="flex-1">
                              <div className="mb-2 text-sm font-medium">End Date</div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {customEndDate ? format(customEndDate, "PPP") : "Select date"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={customEndDate}
                                    onSelect={(date) => date && setCustomEndDate(date)}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Export button */}
                      <div className="flex justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Get the current date range
                            const { start, end } = getDateRangeForOption(dateRangeOption);
                            
                            // Generate CSV and download
                            const csvContent = generateCSV(tableData, timers);
                            downloadCSV(csvContent, `timer-history-${format(start, "yyyy-MM-dd")}-to-${format(end, "yyyy-MM-dd")}.csv`);
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV
                        </Button>
                      </div>
                    </div>
                    
                    {/* Table display */}
                    <div className={`mx-4 mb-4 border rounded-xl overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <div className={`w-full ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Timer
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Date
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Time
                              </th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                            {isTableLoading ? (
                              <tr>
                                <td colSpan={3} className="px-6 py-4 text-center">
                                  <div className="flex justify-center">
                                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                                  </div>
                                </td>
                              </tr>
                            ) : tableData.length === 0 ? (
                              <tr>
                                <td colSpan={3} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                  No data available for the selected time period
                                </td>
                              </tr>
                            ) : (
                              // Filter and display the history data
                              tableData
                                .filter(entry => selectedTimerIds.includes(entry.timerId))
                                .map((entry: any) => {
                                  const timer = getTimerById(entry.timerId);
                                  const timestamp = new Date(entry.timestamp);
                                  return (
                                    <tr key={entry.id} className={`hover:${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <div className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: getChartColorForTimer(timers.findIndex(t => t.id === entry.timerId)) }}></div>
                                          <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{timer.label}</div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                          {format(timestamp, "MMM d, yyyy")}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                          {format(timestamp, "h:mm:ss a")}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          
          {/* Timer Selection for Chart */}
          <div className={`p-4 ${isDarkMode ? 'text-white' : ''}`}>
            <h4 className="font-medium mb-2">Select Timers</h4>
            <div className="space-y-2">
              {timers.map((timer, index) => (
                <div key={timer.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: getChartColorForTimer(index) }}
                    ></div>
                    <span>{timer.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`toggle-chart-${timer.id}`}
                      checked={selectedTimerIds.includes(timer.id)}
                      onCheckedChange={(checked) => {
                        // Pass the new state directly to ensure immediate update
                        if (checked) {
                          // Add timer to selection if not already included
                          if (!selectedTimerIds.includes(timer.id)) {
                            const newSelection = [...selectedTimerIds, timer.id];
                            setSelectedTimerIds(newSelection);
                            localStorage.setItem('chartSelectedTimers', JSON.stringify(newSelection));
                          }
                        } else {
                          // Remove timer from selection
                          const newSelection = selectedTimerIds.filter(id => id !== timer.id);
                          setSelectedTimerIds(newSelection);
                          localStorage.setItem('chartSelectedTimers', JSON.stringify(newSelection));
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}