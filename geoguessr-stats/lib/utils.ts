import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFlagEmoji(countryCode: string | undefined) {
    if (!countryCode || countryCode.length !== 2) return '🏴‍☠️';
    return String.fromCodePoint(...countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0)));
}
