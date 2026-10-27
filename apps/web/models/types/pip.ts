import type { GetLyricsResponse } from "@/dto";

export type PiPLayout = "cover-only" | "narrow" | "sidebar" | "pill" | "full";

export interface DocumentPiP {
    requestWindow: (options: {
        width: number;
        height: number;
    }) => Promise<Window>;
}

export interface PiPLyricsResult {
    publicId: string;
    data?: GetLyricsResponse;
    failed: boolean;
}

export interface PiPLyricsState {
    data?: GetLyricsResponse;
    loading: boolean;
    failed: boolean;
}
