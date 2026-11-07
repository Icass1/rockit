import type { GetLyricsResponse } from "@/dto";

export type PiPLyricsData = GetLyricsResponse & { offset?: number };

export type PiPLayout = "cover-only" | "narrow" | "sidebar" | "pill" | "full";

export interface DocumentPiP {
    requestWindow: (options: {
        width: number;
        height: number;
    }) => Promise<Window>;
}

export interface PiPLyricsResult {
    publicId: string;
    data?: PiPLyricsData;
    failed: boolean;
}

export interface PiPLyricsState {
    data?: PiPLyricsData;
    loading: boolean;
    failed: boolean;
}
