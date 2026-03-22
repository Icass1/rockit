const MONTH_KEYS = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
] as const;

export type MonthKey = (typeof MONTH_KEYS)[number];

export function getPreviousMonthKey(): MonthKey {
    return MONTH_KEYS[(new Date().getMonth() + 11) % 12];
}
