import { getThemePreference } from "@/lib/themeUtils";
import { Button } from "@/components/ui/button";
import { Github, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";

interface AboutViewProps {
  onClose?: () => void;
}

export default function AboutView({ onClose }: AboutViewProps = {}) {
  // Get theme preference
  const isDarkMode = getThemePreference();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setLocation("/");
    }
  };
  
  return (
    <div className={`${isMobile ? 'mobile-popup-position' : 'fixed inset-0 bg-black/50 backdrop-blur-sm z-20 flex justify-center items-center p-4'}`}>
      <div className={`flex flex-col w-full ${isMobile ? 'h-full' : 'max-w-2xl shadow-2xl h-[95vh] rounded-xl'} ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
        <header className="py-4 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-green-100 dark:bg-green-900/40">
          <h2 className="text-xl font-bold">About VibeTracker</h2>
          <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
            <X className="h-5 w-5" />
          </Button>
        </header>
      
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div className="flex justify-center mb-2">
            <img src="/VibeTracker_logo_transparent.png" alt="VibeTracker Logo" className="h-36 w-36" />
          </div>
          <div className={`rounded-xl overflow-hidden shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 space-y-4`}>
            <h3 className="text-xl font-medium">About The App</h3>
            <p className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
              VibeTracker is a productivity app that helps you track time intervals between activities. 
              It's perfect for habit tracking, time management, and creating routines.
            </p>
            <p className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
              Create customized timers for any activities you want to track. Set minimum and maximum 
              time goals, receive alerts, and visualize your patterns through comprehensive charts.
            </p>
          </div>

          <div className={`rounded-xl overflow-hidden shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 space-y-4`}>
            <h3 className="text-xl font-medium">Features</h3>
            <ul className={`list-disc pl-5 ${isDarkMode ? "text-gray-300" : "text-gray-700"} space-y-2`}>
              <li>Multiple customizable timers with labels and categories</li>
              <li>Visual progress tracking with minimum and maximum time goals</li>
              <li>Sound notifications when timers are ready</li>
              <li>Dark mode support for comfortable viewing</li>
              <li>Detailed timer history with edit capabilities</li>
              <li>Archive system for unused timers</li>
              <li>Data visualization with daily and weekly charts</li>
              <li>Secure multi-user support</li>
            </ul>
          </div>

          <div className={`rounded-xl overflow-hidden shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 space-y-4`}>
            <h3 className="text-xl font-medium">Developer</h3>
            <p className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
              Created by Scott Mitting to try out Replit. Built with React, TypeScript, and PostgreSQL.
            </p>
            <div className="flex items-center mt-2">
              <Button
                variant="default"
                size="sm"
                className="flex items-center gap-1 mr-2 bg-[#24292e] hover:bg-[#3a3f45] text-white"
                onClick={() => window.open("https://github.com/mittingphx/VibeTracker", "_blank")}
              >
                <Github className="w-4 h-4" /> View on GitHub
              </Button>
            </div>
          </div>

          <div className={`rounded-xl overflow-hidden shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 space-y-4`}>
            <h3 className="text-xl font-medium">Development Cost</h3>
            <p className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
              Approximate cost paid to Replit for AI: <span className="font-semibold text-blue-500 dark:text-blue-400">$18.50</span>
            </p>
            <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"} mt-1`}>
              This represents the AI usage cost as of March 23, 2025, as shown in the Replit admin dashboard.
            </p>
          </div>

          <div className={`rounded-xl overflow-hidden shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 space-y-4`}>
            <h3 className="text-xl font-medium">Recent Updates</h3>
            <ul className={`list-disc pl-5 ${isDarkMode ? "text-gray-300" : "text-gray-700"} space-y-2`}>
              <li><span className="font-medium">March 23, 2025:</span> Added LED-like filling effect to progress wheel, improved timer display with client-side ticking, reorganized TimerCard layout, improved color contrast in charts</li>
              <li><span className="font-medium">March 20, 2025:</span> Added display type selection in settings (bar/wheel), implemented segmented progress wheel</li>
              <li><span className="font-medium">March 15, 2025:</span> Added security features with password recovery system</li>
              <li><span className="font-medium">March 10, 2025:</span> Added multi-user authentication and timer categories</li>
            </ul>
          </div>

          <div className={`text-center ${isDarkMode ? "text-gray-400" : "text-gray-500"} text-sm mt-6`}>
            © {new Date().getFullYear()} VibeTracker by Scott Mitting. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}