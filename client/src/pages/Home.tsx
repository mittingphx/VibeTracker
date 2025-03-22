import { useState, useEffect } from "react";
import TimerCard from "@/components/TimerCard";
import TabBar from "@/components/TabBar";
import ChartView from "@/components/ChartView";
import SettingsView from "@/components/SettingsView";
import NewTimerModal from "@/components/NewTimerModal";
import TimerHistoryView from "@/components/TimerHistoryView";
import { useTimers } from "@/hooks/useTimers";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { preloadSounds } from "@/lib/soundEffects";
import { getThemePreference } from "@/lib/themeUtils";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"timers" | "charts" | "settings">("timers");
  const [showNewTimerModal, setShowNewTimerModal] = useState(false);
  const { 
    timers, 
    isLoading, 
    error,
    archiveTimer 
  } = useTimers();
  const { toast } = useToast();
  const { user } = useAuth();

  // Handle errors during data loading
  if (error) {
    toast({
      title: "Error",
      description: "Failed to load timers. Please try again.",
      variant: "destructive",
    });
  }
  
  // State to store the timer ID to highlight in settings
  const [highlightedTimerId, setHighlightedTimerId] = useState<number | null>(null);
  
  // State for timer history view
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [historyTimerId, setHistoryTimerId] = useState<number | null>(null);
  const [historyTimerName, setHistoryTimerName] = useState<string>("");
  
  // Auto-launch timer creation modal when logged in with no timers
  useEffect(() => {
    if (user && !isLoading && timers.length === 0) {
      setShowNewTimerModal(true);
    }
  }, [user, isLoading, timers.length]);
  
  // Initialize app and handle global events
  useEffect(() => {
    // Preload all sound effects
    preloadSounds();
    
    // Listen for navigateToSettings event from TimerCard
    const handleNavigateToSettings = (event: Event) => {
      const customEvent = event as CustomEvent<{timerId?: number}>;
      if (customEvent.detail && customEvent.detail.timerId) {
        setHighlightedTimerId(customEvent.detail.timerId);
      } else {
        setHighlightedTimerId(null);
      }
      setActiveTab("settings");
    };
    
    window.addEventListener('navigateToSettings', handleNavigateToSettings as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('navigateToSettings', handleNavigateToSettings as EventListener);
    };
  }, []);

  // Determine if dark mode is active
  const isDarkMode = getThemePreference();
  
  return (
    <div className={`max-w-md mx-auto ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} min-h-screen flex flex-col`}>
      {/* Header */}
      <header className={`sticky top-0 z-10 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-200'} pt-12 pb-2 px-4 flex justify-between items-center border-b`}>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>VibeTimer</h1>
        <Button
          onClick={() => setShowNewTimerModal(true)}
          size="icon"
          className="w-10 h-10 rounded-full bg-blue-500"
        >
          <PlusIcon className="h-5 w-5" />
        </Button>
      </header>

      {/* Main Content - Timer List or History View */}
      {activeTab === "timers" && !showHistoryView && (
        <main className="flex-1 overflow-auto px-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          ) : timers.length === 0 ? (
            <div className="text-center py-10">
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No timers yet. Add your first timer!</p>
            </div>
          ) : (
            timers.map((timer) => (
              <TimerCard 
                key={timer.id} 
                timer={timer} 
                onArchive={(id) => {
                  archiveTimer(id);
                  toast({
                    title: "Timer Archived",
                    description: `${timer.label} has been moved to archives`
                  });
                }}
                onViewHistory={(id, label) => {
                  setHistoryTimerId(id);
                  setHistoryTimerName(label);
                  setShowHistoryView(true);
                }}
              />
            ))
          )}
        </main>
      )}
      
      {/* Timer History View */}
      {activeTab === "timers" && showHistoryView && historyTimerId && (
        <main className="flex-1 overflow-hidden">
          <TimerHistoryView 
            timerId={historyTimerId}
            timerName={historyTimerName}
            onClose={() => {
              setShowHistoryView(false);
              setHistoryTimerId(null);
              setHistoryTimerName("");
            }}
          />
        </main>
      )}

      {/* Charts View */}
      {activeTab === "charts" && <ChartView onClose={() => setActiveTab("timers")} />}

      {/* Settings View */}
      {activeTab === "settings" && 
        <SettingsView 
          onClose={() => {
            setActiveTab("timers");
            setHighlightedTimerId(null);
          }} 
          highlightedTimerId={highlightedTimerId}
        />
      }

      {/* Bottom Tab Bar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* New Timer Modal */}
      {showNewTimerModal && (
        <NewTimerModal
          open={showNewTimerModal}
          onClose={() => setShowNewTimerModal(false)}
        />
      )}
    </div>
  );
}
