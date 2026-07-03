export const MONTH_KEYS = [
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER",
] as const;

export type MonthKey = (typeof MONTH_KEYS)[number];

export function getPreviousMonthKey(): MonthKey {
    return MONTH_KEYS[(new Date().getMonth() + 11) % 12];
}

export function utcIsoToLocalDate(isoString: string): Date {
    return new Date(isoString);
}

const HOUR_FMT: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
};

export function formatHour(date: Date): string {
    return date.toLocaleTimeString("en-US", HOUR_FMT);
}

export function formatHourRange(start: Date, end: Date): string {
    return `${formatHour(start)} — ${formatHour(end)}`;
}
