import type { BaseDynamicLyricsResponse } from "@/dto";

export interface LyricsSnapshot {
    provider: string;
    revision: string | null;
    offset: number;
    syncStatus: "provider" | "approved";
    lines: { text: string; timestamp_s: number | null }[];
    dynamic?: BaseDynamicLyricsResponse;
}

export interface LyricsSnapshotState {
    data?: LyricsSnapshot;
    loading: boolean;
    failed: boolean;
}
