export type StatsRange = "7d" | "30d" | "1y" | "all" | "custom";
export interface StatsRangeOption {
    label: string;
    value: StatsRange;
}
export interface StatsInsightMetric {
    key: string;
    label: string;
    value: string;
}
