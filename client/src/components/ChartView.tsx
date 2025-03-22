import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CalendarIcon, BarChart, BarChart2, TrendingUp, Clock } from "lucide-react";
import { useCharts } from "@/hooks/useCharts";
import { useTimers } from "@/hooks/useTimers";
import { getThemePreference } from "@/lib/themeUtils";
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
  const { timers } = useTimers();
  const [chartMode, setChartMode] = useState<ChartMode>("today");
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("daily");
  const [chartType, setChartType] = useState<ChartType>("count");
  
  // Track which timers are selected for chart display
  const [selectedTimerIds, setSelectedTimerIds] = useState<number[]>(
    timers.map(timer => timer.id)
  );

  // Get today/this week and yesterday/last week dates
  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);
  const thisWeekStart = startOfWeek(today);
  const thisWeekEnd = endOfWeek(today);
  const lastWeekStart = startOfWeek(subWeeks(today, 1));
  const lastWeekEnd = endOfWeek(subWeeks(today, 1));

  // Get chart data based on the selected period and mode
  const { 
    currentPeriodData, 
    comparisonPeriodData,
    averageTimeBetweenPresses,
    pressEvents,
    isLoading, 
    error 
  } = useCharts({
    period: chartPeriod,
    currentStart: chartPeriod === "daily" ? today : thisWeekStart,
    currentEnd: chartPeriod === "daily" ? today : thisWeekEnd,
    comparisonStart: chartPeriod === "daily" ? yesterday : lastWeekStart,
    comparisonEnd: chartPeriod === "daily" ? yesterday : lastWeekEnd,
    selectedTimerIds
  });

  const toggleTimerSelection = (timerId: number) => {
    setSelectedTimerIds(prev => 
      prev.includes(timerId)
        ? prev.filter(id => id !== timerId)
        : [...prev, timerId]
    );
  };

  // Generate chart data for display
  const countChartData = chartMode === "today" 
    ? currentPeriodData
    : [...currentPeriodData, ...comparisonPeriodData];

  // Get timer details by ID for coloring
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
    <div className={`fixed inset-0 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} z-20 flex flex-col`}>
      <header className={`pt-12 pb-2 px-4 flex items-center justify-between border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Charts</h2>
        <Button variant="ghost" className="text-blue-500" onClick={onClose}>
          Done
        </Button>
      </header>
      
      {/* Chart Type Selection */}
      <div className="px-4 pt-4">
        <Tabs value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="count">
              <BarChart className="h-4 w-4 mr-2" />
              Count
            </TabsTrigger>
            <TabsTrigger value="average">
              <TrendingUp className="h-4 w-4 mr-2" />
              Avg. Time
            </TabsTrigger>
            <TabsTrigger value="events">
              <Clock className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Chart Period Selection */}
      <div className="p-4 flex items-center justify-between">
        <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {chartType === "count" && (chartPeriod === "daily" ? "Daily Activity" : "Weekly Summary")}
          {chartType === "average" && "Average Minutes Between Presses"}
          {chartType === "events" && "Press Timeline"}
        </h3>
        
        {chartType === "count" && (
          <div className="flex items-center space-x-3">
            <Button
              size="sm"
              variant={chartMode === "today" ? "default" : "outline"}
              className={chartMode === "today" ? "bg-blue-500 text-white" : ""}
              onClick={() => setChartMode("today")}
            >
              {chartPeriod === "daily" ? "Today" : "This Week"}
            </Button>
            <Button
              size="sm"
              variant={chartMode === "compare" ? "default" : "outline"}
              className={chartMode === "compare" ? "bg-blue-500 text-white" : ""}
              onClick={() => setChartMode("compare")}
            >
              Compare
            </Button>
          </div>
        )}
      </div>
      
      {/* Chart Period Tabs - Only show for count charts */}
      {chartType === "count" && (
        <div className="px-4 flex space-x-4 mb-4">
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
      <div className={`mx-4 border rounded-xl p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} flex-1 overflow-auto`}>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center px-6">
              <p className="text-gray-600">Failed to load chart data</p>
            </div>
          </div>
        ) : (
          <>
            {/* Count Chart - Number of presses per time period */}
            {chartType === "count" && (
              countChartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center px-6">
                    <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No count data available for the selected period</p>
                  </div>
                </div>
              ) : (
                <VictoryChart
                  theme={VictoryTheme.material}
                  domainPadding={20}
                  height={250}
                >
                  <VictoryLegend
                    x={50}
                    y={0}
                    centerTitle
                    orientation="horizontal"
                    data={
                      timers
                        .filter(timer => selectedTimerIds.includes(timer.id))
                        .map(timer => ({
                          name: timer.label,
                          symbol: { fill: timer.color }
                        }))
                    }
                  />
                  <VictoryAxis
                    tickFormat={x => x}
                  />
                  <VictoryAxis
                    dependentAxis
                    tickFormat={x => `${x}x`}
                  />
                  <VictoryStack>
                    {timers
                      .filter(timer => selectedTimerIds.includes(timer.id))
                      .map(timer => (
                        <VictoryBar
                          key={timer.id}
                          data={countChartData.filter(d => d.timerId === timer.id)}
                          x="timestamp"
                          y="count"
                          style={{ data: { fill: timer.color } }}
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
                    <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No average time data available. Needs at least two presses per timer.</p>
                  </div>
                </div>
              ) : (
                <VictoryChart
                  theme={VictoryTheme.material}
                  domainPadding={20}
                  height={300}
                >
                  <VictoryLegend
                    x={50}
                    y={0}
                    centerTitle
                    orientation="horizontal"
                    data={
                      timers
                        .filter(timer => selectedTimerIds.includes(timer.id))
                        .map(timer => ({
                          name: timer.label,
                          symbol: { fill: timer.color }
                        }))
                    }
                  />
                  <VictoryAxis
                    tickFormat={(x) => x} // Date string format
                    label="Date"
                    style={{
                      axisLabel: { padding: 30 }
                    }}
                  />
                  <VictoryAxis
                    dependentAxis
                    label="Average Minutes"
                    style={{
                      axisLabel: { padding: 40 }
                    }}
                  />
                  {timers
                    .filter(timer => selectedTimerIds.includes(timer.id))
                    .map(timer => (
                      <VictoryScatter
                        key={timer.id}
                        data={averageTimeBetweenPresses.filter(d => d.timerId === timer.id)}
                        x="date"
                        y="averageMinutes"
                        size={8}
                        style={{ 
                          data: { 
                            fill: timer.color,
                            stroke: "white",
                            strokeWidth: 1
                          } 
                        }}
                        symbol="square"
                        labelComponent={
                          <VictoryTooltip
                            flyoutStyle={{ fill: "white", stroke: "#ccc" }}
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
                    <Clock className="h-16 w-16 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No timeline data available. Need at least two presses per timer.</p>
                  </div>
                </div>
              ) : (
                <VictoryChart
                  theme={VictoryTheme.material}
                  domainPadding={20}
                  height={300}
                  scale={{ x: "time" }}
                >
                  <VictoryLegend
                    x={50}
                    y={0}
                    centerTitle
                    orientation="horizontal"
                    data={
                      timers
                        .filter(timer => selectedTimerIds.includes(timer.id))
                        .map(timer => ({
                          name: timer.label,
                          symbol: { fill: timer.color }
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
                      axisLabel: { padding: 30 }
                    }}
                  />
                  <VictoryAxis
                    dependentAxis
                    label="Minutes Since Last Press"
                    style={{
                      axisLabel: { padding: 40 }
                    }}
                  />
                  {/* Render all lines first, then all scatter points */}
                  {timers
                    .filter(timer => selectedTimerIds.includes(timer.id))
                    .map(timer => (
                      <VictoryLine
                        key={`line-${timer.id}`}
                        data={pressEvents.filter(d => d.timerId === timer.id)}
                        x="timestamp"
                        y="minutesSinceLast"
                        style={{
                          data: { stroke: timer.color, strokeOpacity: 0.5, strokeWidth: 2 }
                        }}
                      />
                    ))}
                  
                  {timers
                    .filter(timer => selectedTimerIds.includes(timer.id))
                    .map(timer => (
                      <VictoryScatter
                        key={`scatter-${timer.id}`}
                        data={pressEvents.filter(d => d.timerId === timer.id)}
                        x="timestamp"
                        y="minutesSinceLast"
                        size={5}
                        style={{ data: { fill: timer.color } }}
                        labelComponent={
                          <VictoryTooltip
                            flyoutStyle={{ fill: "white", stroke: "#ccc" }}
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
      <div className="p-4">
        <h4 className="font-medium mb-2">Select Timers</h4>
        <div className="space-y-2">
          {timers.map(timer => (
            <div key={timer.id} className="flex items-center justify-between">
              <span>{timer.label}</span>
              <div className="flex items-center space-x-2">
                <Switch
                  id={`toggle-chart-${timer.id}`}
                  checked={selectedTimerIds.includes(timer.id)}
                  onCheckedChange={() => toggleTimerSelection(timer.id)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
