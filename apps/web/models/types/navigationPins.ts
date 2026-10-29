import type { TMediaWithSearch } from "@rockit/shared";

export type NavigationPinsStatus = "idle" | "loading" | "ready" | "error";
export type PinnableMedia = Extract<
    TMediaWithSearch,
    { type: "album" | "playlist" | "artist" }
>;
