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
    // Calculate the circle parameters
    const radius = size / 2;
    const innerRadius = radius - thickness;
    const circumference = 2 * Math.PI * innerRadius;
    
    // Determine our segment boundaries (as percentages 0-100)
    const minPercentage = 33; // First segment (red) takes up first 33% of wheel
    const midPercentage = 66; // Second segment (yellow) takes up next 33%
    // Third segment (green) takes up final 34%
    
    // Define the segment sizes (as fractions of the circle circumference)
    const segment1Size = minPercentage / 100;
    const segment2Size = (midPercentage - minPercentage) / 100;
    const segment3Size = (100 - midPercentage) / 100;
    
    // Calculate the lit portion for each segment
    let segment1Lit = 0;
    let segment2Lit = 0;
    let segment3Lit = 0;
    
    // First segment (Red) - fills up as progress goes from 0% to 33%
    if (value <= minPercentage) {
      segment1Lit = (value / minPercentage) * segment1Size;
    } else {
      segment1Lit = segment1Size; // Completely lit
    }
    
    // Second segment (Yellow) - fills up as progress goes from 33% to 66%
    if (value > minPercentage && value <= midPercentage) {
      segment2Lit = ((value - minPercentage) / (midPercentage - minPercentage)) * segment2Size;
    } else if (value > midPercentage) {
      segment2Lit = segment2Size; // Completely lit
    }
    
    // Third segment (Green) - fills up as progress goes from 66% to 100%
    if (value > midPercentage) {
      segment3Lit = ((value - midPercentage) / (100 - midPercentage)) * segment3Size;
    }
    
    // Dim color versions (at 30% opacity)
    const dimRedColor = fadeColor(minColor, 0.3);
    const dimYellowColor = fadeColor(targetColor, 0.3);
    const dimGreenColor = fadeColor(overColor, 0.3);
    
    // Bright colors (full opacity)
    const brightRedColor = minColor;
    const brightYellowColor = targetColor;
    const brightGreenColor = overColor;
    
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
          {/* Background segments (dim colors) */}
          {/* Red segment background */}
          <circle
            cx={radius}
            cy={radius}
            r={innerRadius}
            fill="none"
            stroke={dimRedColor}
            strokeWidth={thickness}
            strokeDasharray={`${circumference * segment1Size} ${circumference}`}
            strokeDashoffset={0}
          />
          
          {/* Yellow segment background */}
          <circle
            cx={radius}
            cy={radius}
            r={innerRadius}
            fill="none"
            stroke={dimYellowColor}
            strokeWidth={thickness}
            strokeDasharray={`${circumference * segment2Size} ${circumference}`}
            strokeDashoffset={-(circumference * segment1Size)}
          />
          
          {/* Green segment background */}
          <circle
            cx={radius}
            cy={radius}
            r={innerRadius}
            fill="none"
            stroke={dimGreenColor}
            strokeWidth={thickness}
            strokeDasharray={`${circumference * segment3Size} ${circumference}`}
            strokeDashoffset={-(circumference * (segment1Size + segment2Size))}
          />
          
          {/* Progress indicators (bright colors) - these get filled in as progress increases */}
          {/* Red segment fill */}
          {segment1Lit > 0 && (
            <circle
              cx={radius}
              cy={radius}
              r={innerRadius}
              fill="none"
              stroke={brightRedColor}
              strokeWidth={thickness}
              strokeDasharray={`${circumference * segment1Lit} ${circumference}`}
              strokeDashoffset={0}
              className="transition-all duration-200 ease-in-out"
            />
          )}
          
          {/* Yellow segment fill */}
          {segment2Lit > 0 && (
            <circle
              cx={radius}
              cy={radius}
              r={innerRadius}
              fill="none"
              stroke={brightYellowColor}
              strokeWidth={thickness}
              strokeDasharray={`${circumference * segment2Lit} ${circumference}`}
              strokeDashoffset={-(circumference * segment1Size)}
              className="transition-all duration-200 ease-in-out"
            />
          )}
          
          {/* Green segment fill */}
          {segment3Lit > 0 && (
            <circle
              cx={radius}
              cy={radius}
              r={innerRadius}
              fill="none"
              stroke={brightGreenColor}
              strokeWidth={thickness}
              strokeDasharray={`${circumference * segment3Lit} ${circumference}`}
              strokeDashoffset={-(circumference * (segment1Size + segment2Size))}
              className="transition-all duration-200 ease-in-out"
            />
          )}
        </svg>
      </div>
    );
  }
);

ProgressWheel.displayName = "ProgressWheel";

// Helper function to create a colored version of a color with specified opacity
function fadeColor(hexColor: string, opacity: number): string {
  if (opacity >= 1) return hexColor;
  
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Return rgba string
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export { ProgressWheel };