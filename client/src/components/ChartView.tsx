import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CalendarIcon, BarChart, BarChart2 } from "lucide-react";
import { useCharts } from "@/hooks/useCharts";
import { useTimers } from "@/hooks/useTimers";
import {
  VictoryChart,
  VictoryBar,
  VictoryAxis,
  VictoryTheme,
  VictoryStack,
  VictoryLegend,
} from "victory";
import { format, subDays, startOfDay, startOfWeek, endOfWeek, subWeeks } from "date-fns";

interface ChartViewProps {
  onClose: () => void;
}

type ChartMode = "today" | "compare";
type ChartPeriod = "daily" | "weekly";

export default function ChartView({ onClose }: ChartViewProps) {
  const { timers } = useTimers();
  const [chartMode, setChartMode] = useState<ChartMode>("today");
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("daily");
  
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
  const chartData = chartMode === "today" 
    ? currentPeriodData
    : [...currentPeriodData, ...comparisonPeriodData];

  return (
    <div className="fixed inset-0 bg-white z-20 flex flex-col">
      <header className="pt-12 pb-2 px-4 flex items-center justify-between border-b border-gray-200">
        <h2 className="text-2xl font-bold">Charts</h2>
        <Button variant="ghost" className="text-blue-500" onClick={onClose}>
          Done
        </Button>
      </header>
      
      {/* Chart Period Selection */}
      <div className="p-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold">
          {chartPeriod === "daily" ? "Daily Activity" : "Weekly Summary"}
        </h3>
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
      </div>
      
      {/* Chart Period Tabs */}
      <div className="px-4 flex space-x-4 mb-4">
        <Button
          variant="ghost"
          className={`px-2 ${chartPeriod === "daily" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-600"}`}
          onClick={() => setChartPeriod("daily")}
        >
          <BarChart className="h-4 w-4 mr-2" />
          Daily
        </Button>
        <Button
          variant="ghost"
          className={`px-2 ${chartPeriod === "weekly" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-600"}`}
          onClick={() => setChartPeriod("weekly")}
        >
          <BarChart2 className="h-4 w-4 mr-2" />
          Weekly
        </Button>
      </div>
      
      {/* Chart Display */}
      <div className="mx-4 border rounded-xl p-4 bg-gray-50">
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
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center px-6">
              <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No data available for the selected period</p>
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
              tickFormat={x => format(new Date(x), chartPeriod === "daily" ? "HH:mm" : "EEE")}
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
                    data={chartData.filter(d => d.timerId === timer.id)}
                    x="timestamp"
                    y="count"
                    style={{ data: { fill: timer.color } }}
                  />
                ))}
            </VictoryStack>
          </VictoryChart>
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
