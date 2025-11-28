/**
 * Convert seconds to an "m:ss" string.
 *
 * @param seconds  number of seconds (may be fractional)
 * @returns        time string, e.g. 75 → "1:15"
 *
 * Edge-case handling:
 * - Negative or NaN returns "0:00"
 * - Large values roll minutes naturally (e.g. 3601 -> "60:01")
 * - Fractional seconds are rounded to the nearest whole
 */
export function formatTime(seconds: number = 0): string {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return "0:00";
    }

    const totalSeconds = Math.round(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = (totalSeconds % 60).toString().padStart(2, '0');

    return `${minutes}:${remainingSeconds}`;
}
