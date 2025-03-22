import { useState, useEffect, useRef } from "react";
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
import { getThemePreference, applyTheme } from "@/lib/themeUtils";
import { Trash, RefreshCcw, Archive, Download, Upload, Github, Info, User, LogIn, LogOut } from "lucide-react";
import { Timer } from "@shared/schema";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SettingsViewProps {
  onClose: () => void;
  highlightedTimerId?: number | null;
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

export default function SettingsView({ onClose, highlightedTimerId }: SettingsViewProps) {
  const { timers, isLoading } = useTimers();
  const { toast } = useToast();
  const [darkMode, setDarkMode] = useState(getThemePreference);
  const [notifications, setNotifications] = useState(true);
  const [keepScreenAwake, setKeepScreenAwake] = useState(false);
  const [expandedTimerId, setExpandedTimerId] = useState<number | null>(null);
  
  // User authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [expandedCredits, setExpandedCredits] = useState(false);
  
  // Import/Export references and state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  
  // Archived timers state
  const [archivedTimers, setArchivedTimers] = useState<Timer[]>([]);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  
  // Apply dark mode when component mounts or darkMode changes
  useEffect(() => {
    // Apply theme using the utility function
    applyTheme(darkMode);
  }, [darkMode]);

  // Load archived timers when Settings view opens
  useEffect(() => {
    const fetchArchivedTimers = async () => {
      try {
        setIsLoadingArchived(true);
        const response = await fetch('/api/timers/archived');
        const data = await response.json();
        console.log("Archived timers loaded:", data);
        setArchivedTimers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch archived timers:", error);
        toast({
          title: "Error",
          description: "Failed to load archived timers",
          variant: "destructive",
        });
      } finally {
        setIsLoadingArchived(false);
      }
    };

    fetchArchivedTimers();
  }, [toast]);
  
  // Auto-expand the highlighted timer (if provided) - only once when highlightedTimerId changes
  useEffect(() => {
    // Only run this effect once per highlightedTimerId value
    const timer_id = highlightedTimerId;
    
    if (timer_id && !isLoading) {
      // Expand the timer
      handleExpandTimer(timer_id);
      
      // Scroll to the highlighted timer with smooth animation
      setTimeout(() => {
        const timerElement = document.getElementById(`timer-${timer_id}`);
        if (timerElement) {
          timerElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedTimerId, isLoading]);
  
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
  
  // Archive timer instead of deleting
  const handleArchiveTimer = async (id: number) => {
    try {
      await apiRequest("POST", `/api/timers/${id}/archive`, {});
      
      // Remove from active timers and add to archived
      const timerToArchive = timers.find(t => t.id === id);
      if (timerToArchive) {
        setArchivedTimers([...archivedTimers, timerToArchive]);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
      
      toast({
        title: "Timer Archived",
        description: "Timer has been moved to the archive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive timer",
        variant: "destructive",
      });
    }
  };
  
  // Restore timer from archive
  const handleRestoreTimer = async (id: number) => {
    try {
      await apiRequest("POST", `/api/timers/${id}/restore`, {});
      
      // Remove from archived list
      setArchivedTimers(archivedTimers.filter(t => t.id !== id));
      
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
      
      toast({
        title: "Timer Restored",
        description: "Timer has been restored from the archive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore timer",
        variant: "destructive",
      });
    }
  };
  
  // Delete all archived timers
  const handleClearAllArchived = async () => {
    if (!window.confirm("Are you sure you want to permanently delete all archived timers? This action cannot be undone.")) {
      return;
    }
    
    try {
      await apiRequest("DELETE", "/api/timers/archived", {});
      setArchivedTimers([]);
      
      toast({
        title: "Archives Cleared",
        description: "All archived timers have been permanently deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear archives",
        variant: "destructive",
      });
    }
  };
  
  // Export timer data to JSON file
  const handleExportData = () => {
    // Combine active and archived timers for export
    const exportData = {
      timers: timers,
      archivedTimers: archivedTimers,
      exportDate: new Date().toISOString(),
    };
    
    // Create a Blob with the data
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a link element to trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `vibe-timer-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Successful",
      description: "Timer data has been exported successfully",
    });
  };
  
  // Trigger file input click for import
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle file selection for import
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setImportError(null);
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const importData = JSON.parse(content);
          
          // Validate the import data structure
          if (!importData.timers || !Array.isArray(importData.timers)) {
            throw new Error("Invalid import data: missing timers array");
          }
          
          // Confirm import
          if (window.confirm(`Import ${importData.timers.length} timers? This will replace your current timers.`)) {
            // TODO: Call API to handle import on server-side
            // For now, show a toast that this feature is coming soon
            toast({
              title: "Import Functionality",
              description: "Full import functionality coming soon. Backend API endpoint needs to be implemented.",
            });
          }
        } catch (error) {
          console.error("Error parsing import data:", error);
          setImportError("Invalid import file format");
          toast({
            title: "Import Failed",
            description: "The selected file is not a valid timer export",
            variant: "destructive",
          });
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error("Error reading import file:", error);
      toast({
        title: "Import Failed",
        description: "Failed to read the import file",
        variant: "destructive",
      });
    }
  };
  
  // Login with Replit
  const handleReplitLogin = () => {
    // This is a placeholder for Replit authentication implementation
    // We'll need to set up OAuth with Replit for actual implementation
    toast({
      title: "Login Feature",
      description: "Replit authentication integration coming soon!",
    });
  };
  
  // Logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername("");
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-20 flex flex-col">
      <header className="pt-12 pb-2 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold dark:text-white">Settings</h2>
        <Button variant="ghost" className="text-blue-500" onClick={onClose}>
          Done
        </Button>
      </header>
      
      <div className="flex-1 overflow-auto">
        {/* Timer Settings */}
        <div className="mx-4 mt-4 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <h3 className="text-lg font-medium p-4 border-b border-gray-200 dark:border-gray-700 dark:text-white">Timer Settings</h3>
          
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
              <div id={`timer-${timer.id}`} key={timer.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                <div className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium dark:text-white">{timer.label}</span>
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
                    <div className="flex gap-2 mt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleExpandTimer(timer.id)}
                      >
                        {expandedTimerId === timer.id ? "Cancel" : "Edit Settings"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                        onClick={() => handleArchiveTimer(timer.id)}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    </div>
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
        
        {/* Archives */}
        <div className="mx-4 mt-4 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <h3 className="text-lg font-medium p-4 border-b border-gray-200 dark:border-gray-700 dark:text-white">Archives</h3>
          
          {/* Archive Actions */}
          <div className="p-4 flex space-x-2">
            {archivedTimers.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm" 
                className="flex items-center"
                onClick={handleClearAllArchived}
              >
                <Trash className="w-4 h-4 mr-1" /> Clear All
              </Button>
            )}
          </div>
          
          {/* Archived Timers List */}
          {isLoadingArchived ? (
            <div className="p-4 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          ) : archivedTimers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No archived timers
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {archivedTimers.map((timer) => (
                <div key={timer.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{timer.label}</h4>
                      <div className="text-sm text-gray-500 mt-1">
                        Min time: {formatTimeDuration(timer.minTime, true)}
                        {timer.maxTime ? ` • Target: ${formatTimeDuration(timer.maxTime, true)}` : ''}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center"
                      onClick={() => handleRestoreTimer(timer.id)}
                    >
                      <RefreshCcw className="w-4 h-4 mr-1" /> Restore
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Credits */}
        <div className="mx-4 mt-4 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <Collapsible
            open={expandedCredits}
            onOpenChange={setExpandedCredits}
          >
            <CollapsibleTrigger asChild>
              <div className="flex justify-between items-center p-4 cursor-pointer border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium dark:text-white">
                  <Info className="w-5 h-5 inline-block mr-2 text-blue-500" />
                  About VibeTimer
                </h3>
                <div className="text-gray-400">
                  {expandedCredits ? "▲" : "▼"}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 space-y-3 text-sm">
              <p className="dark:text-gray-300">
                VibeTimer is a productivity app that helps you track time intervals between activities. 
                It's perfect for habit tracking, time management, and creating routines.
              </p>
              <p className="dark:text-gray-300">
                Built with React, TypeScript, and PostgreSQL. Created on Replit.
              </p>
              <div className="flex items-center mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => window.open("https://github.com/replit", "_blank")}
                >
                  <Github className="w-4 h-4" /> GitHub
                </Button>
              </div>
              <div className="text-xs text-gray-500 mt-3 dark:text-gray-400">
                © {new Date().getFullYear()} VibeTimer. All rights reserved.
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        
        {/* User Authentication & Data Management */}
        <div className="mx-4 mt-4 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <h3 className="text-lg font-medium p-4 border-b border-gray-200 dark:border-gray-700 dark:text-white">
            <User className="w-5 h-5 inline-block mr-2 text-blue-500" />
            Account & Data
          </h3>
          
          <div className="p-4 space-y-4">
            {/* Authentication */}
            <div>
              {isLoggedIn ? (
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium dark:text-white">Logged in as {username}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Your timers are synced to your Replit account</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" /> Log Out
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="font-medium mb-2 dark:text-white">Sync Your Timers</div>
                  <div className="text-sm text-gray-500 mb-3 dark:text-gray-400">
                    Log in with your Replit account to save your timers and sync across devices
                  </div>
                  <Button
                    variant="default"
                    className="w-full flex items-center justify-center gap-1.5"
                    onClick={handleReplitLogin}
                  >
                    <LogIn className="w-4 h-4" /> Login with Replit
                  </Button>
                </div>
              )}
            </div>
            
            {/* Import/Export */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <div className="font-medium mb-2 dark:text-white">Import/Export Data</div>
              <div className="text-sm text-gray-500 mb-3 dark:text-gray-400">
                Export your timers or import from a backup file
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 flex items-center justify-center gap-1"
                  onClick={handleExportData}
                >
                  <Download className="w-4 h-4" /> Export
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 flex items-center justify-center gap-1"
                  onClick={handleImportClick}
                >
                  <Upload className="w-4 h-4" /> Import
                </Button>
                
                {/* Hidden file input for import */}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".json"
                  onChange={handleFileChange}
                />
              </div>
              {importError && (
                <div className="text-red-500 text-sm mt-2">
                  {importError}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* App Settings */}
        <div className="mx-4 mt-4 mb-6 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <h3 className="text-lg font-medium p-4 border-b border-gray-200 dark:border-gray-700 dark:text-white">App Settings</h3>
          
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="dark:text-white">Dark Mode</span>
              <Switch 
                checked={darkMode}
                onCheckedChange={(checked) => {
                  // Update state
                  setDarkMode(checked);
                  
                  // Apply theme using the utility function
                  applyTheme(checked);
                }}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <span className="dark:text-white">Notifications</span>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <span className="dark:text-white">Keep Screen Awake</span>
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
