import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * Formats seconds into a time string format (MM:SS or H:MM:SS).
 * @param seconds - The total number of seconds.
 * @returns A string representing the formatted time.
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const secsStr = secs.toString().padStart(2, '0');
  const minsStr = minutes.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${minsStr}:${secsStr}`;
  } else {
    return `${minsStr}:${secsStr}`;
  }
}