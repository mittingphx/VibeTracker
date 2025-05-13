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
