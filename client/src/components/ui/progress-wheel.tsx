import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressWheelProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  minValue?: number;
  maxValue?: number;
  size?: number;
  thickness?: number;
  minColor?: string;
  targetColor?: string;
  overColor?: string;
}

const ProgressWheel = React.forwardRef<HTMLDivElement, ProgressWheelProps>(
  ({ 
    className, 
    value = 0, 
    minValue = 0,
    maxValue = 100,
    size = 120,
    thickness = 15,
    minColor = "#FF3B30", // iOS red for under min time
    targetColor = "#FFCC00", // iOS yellow for between min and target
    overColor = "#34C759", // iOS green for over target
    ...props 
  }, ref) => {
    // Normalize value between 0 and 1 for circle calculation
    const normalizedValue = Math.min(Math.max(value, 0), 100) / 100;
    
    // Calculate the circle parameters
    const radius = size / 2;
    const innerRadius = radius - thickness;
    const circumference = 2 * Math.PI * innerRadius;
    const arc = circumference * normalizedValue;
    const dashArray = `${arc} ${circumference}`;
    const transform = `rotate(-90 ${radius} ${radius})`;
    
    // Determine min and max percentages for color transitions
    const minPercentage = minValue > 0 ? (minValue / maxValue) * 100 : 0;
    const maxPercentage = 100;
    
    // Calculate current segment (pre-min, min-to-target, or post-target)
    const isPreMin = value < minPercentage;
    const isPostMax = value >= maxPercentage;
    const isMiddle = !isPreMin && !isPostMax;
    
    // Determine active color based on current segment
    let activeColor;
    if (isPreMin) {
      activeColor = minColor;
    } else if (isMiddle) {
      activeColor = targetColor;
    } else {
      activeColor = overColor;
    }
    
    // Create gradient definitions for LED-like effect
    const dimMinColor = fadeColor(minColor, 0.3);
    const dimTargetColor = fadeColor(targetColor, 0.3);
    const dimOverColor = fadeColor(overColor, 0.3);
    
    return (
      <div
        ref={ref}
        className={cn("relative", className)}
        {...props}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Define gradients for LED-like effects */}
          <defs>
            <linearGradient id="minGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={dimMinColor} />
              <stop offset="100%" stopColor={minColor} />
            </linearGradient>
            <linearGradient id="targetGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={dimTargetColor} />
              <stop offset="100%" stopColor={targetColor} />
            </linearGradient>
            <linearGradient id="overGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={dimOverColor} />
              <stop offset="100%" stopColor={overColor} />
            </linearGradient>
          </defs>
          
          {/* Background circles for each segment (dim version) */}
          {/* Pre-min segment (0% to minPercentage) */}
          <circle
            cx={radius}
            cy={radius}
            r={innerRadius}
            fill="none"
            stroke={dimMinColor}
            strokeWidth={thickness}
            strokeDasharray={`${(circumference * minPercentage) / 100} ${circumference}`}
            strokeDashoffset={0}
            className="transition-all duration-200 ease-in-out"
          />
          
          {/* Min-to-target segment (minPercentage to 100%) */}
          <circle
            cx={radius}
            cy={radius}
            r={innerRadius}
            fill="none"
            stroke={dimTargetColor}
            strokeWidth={thickness}
            strokeDasharray={`${(circumference * (maxPercentage - minPercentage)) / 100} ${circumference}`}
            strokeDashoffset={-((circumference * minPercentage) / 100)}
            className="transition-all duration-200 ease-in-out"
          />
          
          {/* Active progress overlay */}
          <circle
            cx={radius}
            cy={radius}
            r={innerRadius}
            fill="none"
            stroke={activeColor}
            strokeWidth={thickness}
            strokeDasharray={dashArray}
            strokeDashoffset={0}
            className="transition-all duration-200 ease-in-out"
          />
        </svg>
      </div>
    );
  }
);

ProgressWheel.displayName = "ProgressWheel";

// Helper function to create a faded version of a color
function fadeColor(hexColor: string, opacity: number): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Return rgba string
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export { ProgressWheel };