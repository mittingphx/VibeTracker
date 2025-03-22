import { useState } from "react";
import TimerCard from "@/components/TimerCard";
import TabBar from "@/components/TabBar";
import ChartView from "@/components/ChartView";
import SettingsView from "@/components/SettingsView";
import NewTimerModal from "@/components/NewTimerModal";
import { useTimers } from "@/hooks/useTimers";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"timers" | "charts" | "settings">("timers");
  const [showNewTimerModal, setShowNewTimerModal] = useState(false);
  const { timers, isLoading, error } = useTimers();
  const { toast } = useToast();

  if (error) {
    toast({
      title: "Error",
      description: "Failed to load timers. Please try again.",
      variant: "destructive",
    });
  }

  return (
    <div className="max-w-md mx-auto bg-gray-100 min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-100 pt-12 pb-2 px-4 flex justify-between items-center border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">VibeTimer</h1>
        <Button
          onClick={() => setShowNewTimerModal(true)}
          size="icon"
          className="w-10 h-10 rounded-full bg-blue-500"
        >
          <PlusIcon className="h-5 w-5" />
        </Button>
      </header>

      {/* Main Content - Timer List */}
      {activeTab === "timers" && (
        <main className="flex-1 overflow-auto px-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          ) : timers.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No timers yet. Add your first timer!</p>
            </div>
          ) : (
            timers.map((timer) => <TimerCard key={timer.id} timer={timer} />)
          )}
        </main>
      )}

      {/* Charts View */}
      {activeTab === "charts" && <ChartView onClose={() => setActiveTab("timers")} />}

      {/* Settings View */}
      {activeTab === "settings" && <SettingsView onClose={() => setActiveTab("timers")} />}

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
