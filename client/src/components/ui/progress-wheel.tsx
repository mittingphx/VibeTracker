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
    
    // Determine min and max percentages for color transitions
    const minPercentage = minValue > 0 ? (minValue / maxValue) * 100 : 33; // Use 33% as default if not specified
    const midPercentage = 66; // Use 66% as the middle section boundary
    
    // Define the segment sizes (as fractions of the circle)
    const segment1Size = minPercentage / 100;
    const segment2Size = (midPercentage - minPercentage) / 100;
    const segment3Size = (100 - midPercentage) / 100;
    
    // Calculate brightness based on progress
    // For each segment, we'll calculate its own brightness based on progress within that segment
    
    // Segment 1 (red) brightness
    let segment1Brightness = 0.3; // Default dim
    if (value < minPercentage) {
      // Calculate brightness from 0.3 to 1 based on progress within segment 1
      segment1Brightness = 0.3 + (0.7 * value / minPercentage);
    } else {
      segment1Brightness = 1; // Full brightness when past this segment
    }
    
    // Segment 2 (yellow) brightness
    let segment2Brightness = 0.3; // Default dim
    if (value >= minPercentage && value < midPercentage) {
      // Calculate brightness from 0.3 to 1 based on progress within segment 2
      segment2Brightness = 0.3 + (0.7 * (value - minPercentage) / (midPercentage - minPercentage));
    } else if (value >= midPercentage) {
      segment2Brightness = 1; // Full brightness when past this segment
    }
    
    // Segment 3 (green) brightness
    let segment3Brightness = 0.3; // Default dim
    if (value >= midPercentage) {
      // Calculate brightness from 0.3 to 1 based on progress within segment 3
      segment3Brightness = 0.3 + (0.7 * (value - midPercentage) / (100 - midPercentage));
    }
    
    // Create colors with appropriate brightness
    const segment1Color = fadeColor(minColor, segment1Brightness);
    const segment2Color = fadeColor(targetColor, segment2Brightness);
    const segment3Color = fadeColor(overColor, segment3Brightness);
    
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
          {/* Segment 1 (Red) - First third (0 to 33%) */}
          <circle
            cx={radius}
            cy={radius}
            r={innerRadius}
            fill="none"
            stroke={segment1Color}
            strokeWidth={thickness}
            strokeDasharray={`${circumference * segment1Size} ${circumference}`}
            strokeDashoffset={0}
            className="transition-all duration-200 ease-in-out"
          />
          
          {/* Segment 2 (Yellow) - Second third (33% to 66%) */}
          <circle
            cx={radius}
            cy={radius}
            r={innerRadius}
            fill="none"
            stroke={segment2Color}
            strokeWidth={thickness}
            strokeDasharray={`${circumference * segment2Size} ${circumference}`}
            strokeDashoffset={-(circumference * segment1Size)}
            className="transition-all duration-200 ease-in-out"
          />
          
          {/* Segment 3 (Green) - Final third (66% to 100%) */}
          <circle
            cx={radius}
            cy={radius}
            r={innerRadius}
            fill="none"
            stroke={segment3Color}
            strokeWidth={thickness}
            strokeDasharray={`${circumference * segment3Size} ${circumference}`}
            strokeDashoffset={-(circumference * (segment1Size + segment2Size))}
            className="transition-all duration-200 ease-in-out"
          />
        </svg>
      </div>
    );
  }
);

ProgressWheel.displayName = "ProgressWheel";

// Helper function to create a colored version of a color with specified opacity/brightness
function fadeColor(hexColor: string, opacity: number): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Return rgba string
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export { ProgressWheel };