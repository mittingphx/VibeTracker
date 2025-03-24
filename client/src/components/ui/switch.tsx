import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";
import { getThemePreference } from "@/lib/themeUtils";

// Switch with customized styling for role="switch" buttons
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => {
  const isDarkMode = getThemePreference();

  return (
    <SwitchPrimitives.Root
      role="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        // Light mode styling
        !isDarkMode && [
          "data-[state=checked]:bg-[rgba(0,100,0,0.8)]",
          "data-[state=unchecked]:bg-[rgba(100,0,0,0.5)] data-[state=unchecked]:border-[rgba(0,0,0,0.8)]",
        ],
        // Dark mode styling - translucent white for both states
        isDarkMode && [
          "data-[state=checked]:bg-[rgba(0,100,0,0.8)]",
          "data-[state=unchecked]:bg-[rgba(100,0,0,0.5)] data-[state=unchecked]:border-[rgba(0,0,0,0.8)]",
        ],
        className,
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        )}
      />
    </SwitchPrimitives.Root>
  );
});
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
