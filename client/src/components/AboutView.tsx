import { getThemePreference } from "@/lib/themeUtils";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function AboutView() {
  // Get theme preference
  const isDarkMode = getThemePreference();
  const isMobile = useIsMobile();
  
  return (
    <div className={`
      ${isMobile ? 'fixed inset-0 z-50 pt-16 pb-16' : 'max-w-2xl mx-auto'} 
      ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} 
      flex flex-col h-full overflow-auto
    `}>
      <header className={`
        sticky top-0 z-10 
        ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-200'} 
        py-4 border-b
      `}>
        <h2 className="text-xl font-bold text-center">About VibeTracker</h2>
      </header>
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className={`
          rounded-xl overflow-hidden shadow-lg 
          ${isDarkMode ? 'bg-gray-800' : 'bg-white'}
          p-6 space-y-4
        `}>
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

        <div className={`
          rounded-xl overflow-hidden shadow-lg 
          ${isDarkMode ? 'bg-gray-800' : 'bg-white'}
          p-6 space-y-4
        `}>
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

        <div className={`
          rounded-xl overflow-hidden shadow-lg 
          ${isDarkMode ? 'bg-gray-800' : 'bg-white'}
          p-6 space-y-4
        `}>
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

        <div className={`
          rounded-xl overflow-hidden shadow-lg 
          ${isDarkMode ? 'bg-gray-800' : 'bg-white'}
          p-6 space-y-4
        `}>
          <h3 className="text-xl font-medium">Development Cost</h3>
          <p className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
            Approximate cost paid to Replit for AI: <span className="font-semibold text-blue-500 dark:text-blue-400">$16.25</span>
          </p>
          <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"} mt-1`}>
            This represents the AI usage cost as of March 23, 2025, as shown in the Replit admin dashboard.
          </p>
        </div>

        <div className={`text-center ${isDarkMode ? "text-gray-400" : "text-gray-500"} text-sm mt-6`}>
          © {new Date().getFullYear()} VibeTracker by Scott Mitting. All rights reserved.
        </div>
      </div>
    </div>
  );
}