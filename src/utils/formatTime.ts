/**
 * Convert seconds → `m:ss`
 *
 * @param seconds  number of seconds (may be fractional)
 * @returns        time string, e.g. 75 → "1:15"
 */
export function formatTime(seconds: number = 0): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60).toString().padStart(2, '0');

    return `${minutes}:${remainingSeconds}`;
}
