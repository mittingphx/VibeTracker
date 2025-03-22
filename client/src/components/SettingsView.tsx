import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTimers } from "@/hooks/useTimers";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatTimeDuration } from "@/utils/timeUtils";

interface SettingsViewProps {
  onClose: () => void;
}

type TimeUnit = "minutes" | "hours" | "days";

// Helper for converting time to seconds
const toSeconds = (value: number, unit: TimeUnit): number => {
  switch (unit) {
    case "minutes":
      return value * 60;
    case "hours":
      return value * 60 * 60;
    case "days":
      return value * 24 * 60 * 60;
    default:
      return value;
  }
};

// Helper for converting seconds to a time unit value
const fromSeconds = (seconds: number, unit: TimeUnit): number => {
  switch (unit) {
    case "minutes":
      return Math.floor(seconds / 60);
    case "hours":
      return Math.floor(seconds / (60 * 60));
    case "days":
      return Math.floor(seconds / (24 * 60 * 60));
    default:
      return seconds;
  }
};

// Helper to determine best unit for time display
const getBestUnit = (seconds: number): TimeUnit => {
  if (seconds >= 24 * 60 * 60) return "days";
  if (seconds >= 60 * 60) return "hours";
  return "minutes";
};

export default function SettingsView({ onClose }: SettingsViewProps) {
  const { timers, isLoading } = useTimers();
  const { toast } = useToast();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [keepScreenAwake, setKeepScreenAwake] = useState(false);
  const [expandedTimerId, setExpandedTimerId] = useState<number | null>(null);
  
  // State for editing timer settings
  const [editMinTime, setEditMinTime] = useState<number>(0);
  const [editMinTimeUnit, setEditMinTimeUnit] = useState<TimeUnit>("hours");
  const [editMaxTime, setEditMaxTime] = useState<number>(0);
  const [editMaxTimeUnit, setEditMaxTimeUnit] = useState<TimeUnit>("hours");
  const [editPlaySound, setEditPlaySound] = useState(true);

  const handleToggleTimer = async (id: number, isEnabled: boolean) => {
    try {
      await apiRequest("PATCH", `/api/timers/${id}`, { isEnabled });
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
      
      toast({
        title: isEnabled ? "Timer Enabled" : "Timer Disabled",
        description: `Timer has been ${isEnabled ? "enabled" : "disabled"}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update timer",
        variant: "destructive",
      });
    }
  };

  const handleToggleSoundAlert = async (id: number, playSound: boolean) => {
    try {
      await apiRequest("PATCH", `/api/timers/${id}`, { playSound });
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
      
      toast({
        title: "Sound Alert Updated",
        description: `Sound alert has been ${playSound ? "enabled" : "disabled"}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update sound alert",
        variant: "destructive",
      });
    }
  };

  const handleExpandTimer = (id: number) => {
    // If same timer clicked, collapse it
    if (expandedTimerId === id) {
      setExpandedTimerId(null);
      return;
    }
    
    // Otherwise expand clicked timer and load its settings
    setExpandedTimerId(id);
    const timer = timers.find(t => t.id === id);
    if (timer) {
      const minTimeUnit = getBestUnit(timer.minTime);
      const maxTimeUnit = timer.maxTime ? getBestUnit(timer.maxTime) : "hours";
      
      setEditMinTime(fromSeconds(timer.minTime, minTimeUnit));
      setEditMinTimeUnit(minTimeUnit);
      
      if (timer.maxTime) {
        setEditMaxTime(fromSeconds(timer.maxTime, maxTimeUnit));
        setEditMaxTimeUnit(maxTimeUnit);
      } else {
        setEditMaxTime(0);
        setEditMaxTimeUnit("hours");
      }
      
      setEditPlaySound(timer.playSound);
    }
  };

  const handleSaveTimerSettings = async (id: number) => {
    try {
      const minTimeSeconds = toSeconds(editMinTime, editMinTimeUnit);
      const maxTimeSeconds = editMaxTime > 0 ? toSeconds(editMaxTime, editMaxTimeUnit) : null;
      
      // Validate max time is greater than min time if both provided
      if (maxTimeSeconds !== null && minTimeSeconds >= maxTimeSeconds) {
        toast({
          title: "Invalid Time Values",
          description: "Target time must be greater than minimum time",
          variant: "destructive",
        });
        return;
      }

      await apiRequest("PATCH", `/api/timers/${id}`, { 
        minTime: minTimeSeconds, 
        maxTime: maxTimeSeconds,
        playSound: editPlaySound
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
      setExpandedTimerId(null);
      
      toast({
        title: "Timer Updated",
        description: "Timer settings have been updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update timer settings",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-100 z-20 flex flex-col">
      <header className="pt-12 pb-2 px-4 flex items-center justify-between border-b border-gray-200">
        <h2 className="text-2xl font-bold">Settings</h2>
        <Button variant="ghost" className="text-blue-500" onClick={onClose}>
          Done
        </Button>
      </header>
      
      <div className="flex-1 overflow-auto">
        {/* Timer Settings */}
        <div className="mx-4 mt-4 bg-white rounded-xl overflow-hidden">
          <h3 className="text-lg font-medium p-4 border-b border-gray-200">Timer Settings</h3>
          
          {isLoading ? (
            <div className="p-4 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          ) : timers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No timers available
            </div>
          ) : (
            timers.map((timer) => (
              <div key={timer.id} className="border-b border-gray-200 last:border-0">
                <div className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium">{timer.label}</span>
                    <Switch
                      checked={timer.isEnabled}
                      onCheckedChange={(checked) => handleToggleTimer(timer.id, checked)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Minimum Time</span>
                      <span className="text-sm font-medium">
                        {formatTimeDuration(timer.minTime, true)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Target Time</span>
                      <span className="text-sm font-medium">
                        {timer.maxTime ? formatTimeDuration(timer.maxTime, true) : "None"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Sound Alert</span>
                      <Switch
                        checked={timer.playSound}
                        onCheckedChange={(checked) => handleToggleSoundAlert(timer.id, checked)}
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => handleExpandTimer(timer.id)}
                    >
                      {expandedTimerId === timer.id ? "Cancel" : "Edit Settings"}
                    </Button>
                  </div>
                </div>
                
                {/* Expanded settings for editing */}
                {expandedTimerId === timer.id && (
                  <div className="p-4 bg-gray-50">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`min-time-${timer.id}`} className="block text-sm font-medium mb-1">
                          Minimum Time
                        </Label>
                        <div className="flex space-x-2">
                          <Input
                            id={`min-time-${timer.id}`}
                            type="number"
                            min="0"
                            value={editMinTime}
                            onChange={(e) => setEditMinTime(Number(e.target.value))}
                            className="w-1/2"
                          />
                          <Select
                            value={editMinTimeUnit}
                            onValueChange={(value) => setEditMinTimeUnit(value as TimeUnit)}
                          >
                            <SelectTrigger className="w-1/2">
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minutes">Minutes</SelectItem>
                              <SelectItem value="hours">Hours</SelectItem>
                              <SelectItem value="days">Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor={`max-time-${timer.id}`} className="block text-sm font-medium mb-1">
                          Target Time (leave 0 for none)
                        </Label>
                        <div className="flex space-x-2">
                          <Input
                            id={`max-time-${timer.id}`}
                            type="number"
                            min="0"
                            value={editMaxTime}
                            onChange={(e) => setEditMaxTime(Number(e.target.value))}
                            className="w-1/2"
                          />
                          <Select
                            value={editMaxTimeUnit}
                            onValueChange={(value) => setEditMaxTimeUnit(value as TimeUnit)}
                          >
                            <SelectTrigger className="w-1/2">
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minutes">Minutes</SelectItem>
                              <SelectItem value="hours">Hours</SelectItem>
                              <SelectItem value="days">Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id={`sound-alert-${timer.id}`}
                          checked={editPlaySound}
                          onCheckedChange={setEditPlaySound}
                        />
                        <Label htmlFor={`sound-alert-${timer.id}`}>
                          Play sound when minimum time is reached
                        </Label>
                      </div>
                      
                      <Button 
                        className="w-full bg-blue-500"
                        onClick={() => handleSaveTimerSettings(timer.id)}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        
        {/* App Settings */}
        <div className="mx-4 mt-4 mb-6 bg-white rounded-xl overflow-hidden">
          <h3 className="text-lg font-medium p-4 border-b border-gray-200">App Settings</h3>
          
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span>Dark Mode</span>
              <Switch 
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <span>Notifications</span>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <span>Keep Screen Awake</span>
              <Switch
                checked={keepScreenAwake}
                onCheckedChange={setKeepScreenAwake}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
