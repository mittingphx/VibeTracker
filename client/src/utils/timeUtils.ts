/**
 * Formats a duration in seconds to a human-readable string
 * @param seconds - Duration in seconds
 * @param compact - Whether to use a compact format (e.g., 2h instead of 2 hours)
 * @returns Formatted duration string
 */
export function formatTimeDuration(seconds: number, compact = false): string {
  if (seconds === 0) return compact ? "0m" : "0 minutes";
  
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  let result = "";
  
  if (days > 0) {
    result += compact ? `${days}d ` : `${days}d `;
  }
  
  if (hours > 0 || days > 0) {
    result += compact ? `${hours}h ` : `${hours}h `;
  }
  
  if (minutes > 0 || (hours === 0 && days === 0)) {
    result += compact ? `${minutes}m` : `${minutes}m`;
  }
  
  return result.trim();
}

/**
 * Calculates progress percentage between min and max time
 * @param elapsedTime - Current elapsed time in seconds
 * @param minTime - Minimum time in seconds
 * @param maxTime - Maximum time in seconds (optional)
 * @returns Progress percentage (0-100)
 */
export function calculateProgress(
  elapsedTime: number,
  minTime: number,
  maxTime: number | null
): number {
  // If no max time, base progress on min time
  if (!maxTime) {
    return Math.min(100, (elapsedTime / minTime) * 100);
  }
  
  // If elapsed time is less than min time
  if (elapsedTime <= minTime) {
    return (elapsedTime / minTime) * 50; // 0-50% for min time
  }
  
  // If elapsed time is more than max time
  if (elapsedTime >= maxTime) {
    return 100;
  }
  
  // If elapsed time is between min and max time
  return 50 + ((elapsedTime - minTime) / (maxTime - minTime) * 50);
}

/**
 * Formats a timestamp to a localized string
 * @param date - Date object or timestamp
 * @returns Formatted date string
 */
export function formatDateTime(date: Date | null): string {
  if (!date) return "Never";
  
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
}
