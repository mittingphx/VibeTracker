import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CalendarIcon, BarChart, BarChart2, TrendingUp, Clock, X } from "lucide-react";
import { useCharts } from "@/hooks/useCharts";
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
import { format, subDays, startOfDay, startOfWeek, endOfWeek, subWeeks, parseISO } from "date-fns";

interface ChartViewProps {
  onClose: () => void;
}

type ChartMode = "today" | "compare";
type ChartPeriod = "daily" | "weekly";
type ChartType = "count" | "average" | "events";

export default function ChartView({ onClose }: ChartViewProps) {
  const isMobile = useIsMobile();
  const { timers } = useTimers();
  const [chartMode, setChartMode] = useState<ChartMode>("today");
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("daily");
  const [chartType, setChartType] = useState<ChartType>("count");
  
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
  
  // Today or this week
  const currentStart = chartPeriod === "daily" 
    ? currentDate 
    : startOfWeek(currentDate, { weekStartsOn: 1 });  // Monday
  
  const currentEnd = chartPeriod === "daily"
    ? new Date(currentDate.getTime() + 24 * 60 * 60 * 1000 - 1)  // End of today
    : endOfWeek(currentDate, { weekStartsOn: 1 });  // Sunday
  
  // Yesterday or last week
  const comparisonStart = chartPeriod === "daily"
    ? startOfDay(subDays(currentDate, 1))  // Yesterday
    : startOfWeek(subWeeks(currentDate, 1), { weekStartsOn: 1 });  // Last week Monday
  
  const comparisonEnd = chartPeriod === "daily"
    ? new Date(comparisonStart.getTime() + 24 * 60 * 60 * 1000 - 1)  // End of yesterday
    : endOfWeek(subWeeks(currentDate, 1), { weekStartsOn: 1 });  // Last week Sunday

  // Fetch chart data based on selected period
  const { currentPeriodData, comparisonPeriodData, averageTimeBetweenPresses, pressEvents, isLoading, error } = useCharts({
    period: chartPeriod,
    currentStart,
    currentEnd,
    comparisonStart,
    comparisonEnd,
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
    <div className={`${isMobile ? 'fixed inset-0 z-50 pt-16 pb-16' : 'fixed inset-0 bg-black/50 backdrop-blur-sm z-20 flex justify-center items-center p-4'}`}>
      <div className={`flex flex-col w-full ${isMobile ? 'h-full' : 'max-w-2xl shadow-2xl h-[95vh] rounded-xl'} ${isDarkMode ? 'bg-gray-900' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        {/* Fixed Header - Always visible */}
        <div className={`flex justify-between items-center p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
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
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="count">Count</TabsTrigger>
              <TabsTrigger value="average">Average Time</TabsTrigger>
              <TabsTrigger value="events">Timeline</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {chartType === "count" && "Number of presses per day"}
            {chartType === "average" && "Average minutes between presses"}
            {chartType === "events" && "Timeline of press events"}
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
          
          {/* Chart Period Selector */}
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
                          return format(date, "MM/dd HH:mm");
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