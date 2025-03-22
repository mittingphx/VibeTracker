import { Clock, BarChart, Settings } from "lucide-react";

interface TabBarProps {
  activeTab: "timers" | "charts" | "settings";
  onTabChange: (tab: "timers" | "charts" | "settings") => void;
}

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="sticky bottom-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 px-4">
      <button 
        className={`flex flex-col items-center justify-center w-16 ${
          activeTab === "timers" ? "text-blue-500" : "text-gray-600"
        }`}
        onClick={() => onTabChange("timers")}
      >
        <Clock className="h-5 w-5" />
        <span className="text-xs mt-1">Timers</span>
      </button>
      
      <button 
        className={`flex flex-col items-center justify-center w-16 ${
          activeTab === "charts" ? "text-blue-500" : "text-gray-600"
        }`}
        onClick={() => onTabChange("charts")}
      >
        <BarChart className="h-5 w-5" />
        <span className="text-xs mt-1">Charts</span>
      </button>
      
      <button 
        className={`flex flex-col items-center justify-center w-16 ${
          activeTab === "settings" ? "text-blue-500" : "text-gray-600"
        }`}
        onClick={() => onTabChange("settings")}
      >
        <Settings className="h-5 w-5" />
        <span className="text-xs mt-1">Settings</span>
      </button>
    </nav>
  );
}
