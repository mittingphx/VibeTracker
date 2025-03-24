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
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const { user, logoutMutation } = useAuth();
  const [darkMode, setDarkMode] = useState(getThemePreference);
  const [notifications, setNotifications] = useState(true);
  const [keepScreenAwake, setKeepScreenAwake] = useState(false);
  const [expandedTimerId, setExpandedTimerId] = useState<number | null>(null);
  
  // Credits section state
  const [expandedCredits, setExpandedCredits] = useState(false);
  
  // Import/Export references and state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  
  // Archived timers state
  const [archivedTimers, setArchivedTimers] = useState<Timer[]>([]);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  
  // Edit form state
  const [editMinTime, setEditMinTime] = useState(5);
  const [editMinTimeUnit, setEditMinTimeUnit] = useState<TimeUnit>("minutes");
  const [editMaxTime, setEditMaxTime] = useState(0);
  const [editMaxTimeUnit, setEditMaxTimeUnit] = useState<TimeUnit>("hours");
  const [editPlaySound, setEditPlaySound] = useState(true);
  const [editDisplayType, setEditDisplayType] = useState<"bar" | "wheel">("bar");
  const [editCategory, setEditCategory] = useState("");
  
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
  
  // Note: Edit form state is already defined above

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
  
  const handleToggleDisplayType = async (id: number, displayType: "bar" | "wheel") => {
    try {
      await apiRequest("PATCH", `/api/timers/${id}`, { displayType });
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
      
      toast({
        title: "Display Type Updated",
        description: `Timer now displays as a ${displayType === "wheel" ? "progress wheel" : "progress bar"}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update display type",
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
      setEditDisplayType(timer.displayType === "wheel" ? "wheel" : "bar");
      setEditCategory(timer.category || "");
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
        playSound: editPlaySound,
        displayType: editDisplayType,
        category: editCategory || null
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
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Logged Out",
          description: "You have been logged out successfully",
        });
      },
      onError: (error) => {
        toast({
          title: "Logout Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  const isMobile = useIsMobile();
  
  return (
    <div className={`${isMobile ? 'fixed inset-0 z-50 pt-16 pb-16' : 'fixed inset-0 bg-gray-600/20 dark:bg-black/50 backdrop-blur-sm z-20 flex justify-center items-center p-4'}`}>
      <div className={`flex flex-col w-full ${isMobile ? 'h-full' : 'max-w-2xl shadow-2xl h-[95vh] rounded-xl'} bg-white dark:bg-gray-900 overflow-hidden border border-gray-200 dark:border-gray-700`}>
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
                      {timer.category && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          Category: {timer.category}
                        </div>
                      )}
                      {/* Display settings as a summary string */}
                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        Min: {formatTimeDuration(timer.minTime, true)} • 
                        Target: {timer.maxTime ? formatTimeDuration(timer.maxTime, true) : "None"} • 
                        Display: {timer.displayType === 'wheel' ? 'Wheel' : 'Bar'} • 
                        Alert: {timer.playSound ? 'On' : 'Off'}
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
                        
                        <div>
                          <Label className="block text-sm font-medium mb-2">
                            Display Type
                          </Label>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <input 
                                type="radio" 
                                id={`display-bar-${timer.id}`} 
                                name={`display-type-${timer.id}`}
                                checked={editDisplayType === 'bar'}
                                onChange={() => setEditDisplayType('bar')}
                              />
                              <Label htmlFor={`display-bar-${timer.id}`}>
                                Bar
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input 
                                type="radio" 
                                id={`display-wheel-${timer.id}`} 
                                name={`display-type-${timer.id}`}
                                checked={editDisplayType === 'wheel'}
                                onChange={() => setEditDisplayType('wheel')}
                              />
                              <Label htmlFor={`display-wheel-${timer.id}`}>
                                Progress Wheel
                              </Label>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor={`category-${timer.id}`} className="block text-sm font-medium mb-1">
                            Category (optional)
                          </Label>
                          <Input
                            id={`category-${timer.id}`}
                            type="text"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            placeholder="e.g., Health, Work, Personal"
                            className="w-full"
                          />
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
                          {timer.category && <span>Category: {timer.category} • </span>}
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
          

          
          {/* User Authentication & Data Management */}
          <div className="mx-4 mt-4 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
            <h3 className="text-lg font-medium p-4 border-b border-gray-200 dark:border-gray-700 dark:text-white">
              <User className="w-5 h-5 inline-block mr-2 text-blue-500" />
              Account & Data
            </h3>
            
            <div className="p-4 space-y-4">
              {/* Authentication */}
              <div>
                {user ? (
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium dark:text-white">Logged in as {user.username}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Your timers are synced to your account</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={handleLogout}
                      disabled={logoutMutation.isPending}
                    >
                      {logoutMutation.isPending ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-1 border-2 border-current border-t-transparent rounded-full"></div>
                          Logging out...
                        </>
                      ) : (
                        <>
                          <LogOut className="w-4 h-4" /> Log Out
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium mb-2 dark:text-white">Sync Your Timers</div>
                    <div className="text-sm text-gray-500 mb-3 dark:text-gray-400">
                      Log in with your account to save your timers and sync across devices
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
    </div>
  );
}