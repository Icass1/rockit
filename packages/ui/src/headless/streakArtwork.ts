/** Each silhouette has a grounded base and gains distinct tongues as days accumulate. */
export const STREAK_FLAME_PATHS = [
    "M13 4C14 9 8 11 8 16a4 4 0 0 0 8 0c0-4-2-7-3-12Z",
    "M13 2c2 6-3 7-3 11-2-1-2-3-2-4-3 4-4 7-3 10a7 7 0 0 0 14-2c0-5-3-9-6-15Z",
    "M14 1c2 5-2 7-2 11-2-1-3-3-3-5-1 3-5 6-5 10a8 8 0 0 0 16 0c0-3-1-5-3-7 0 2-1 3-2 3 2-5 2-8-1-12Z",
    "M13 1c3 4 1 7 0 10-3-1-4-3-4-6C8 8 4 11 5 15c-2-1-2-3-2-4-2 5-1 9 2 11 4 3 10 3 14-1 3-3 3-7 1-11 0 3-1 4-3 5 2-6 0-10-4-14Z",
] as const;
export function streakFlameLevel(days: number): number {
    return days >= 14 ? 3 : days >= 7 ? 2 : days >= 3 ? 1 : 0;
}
