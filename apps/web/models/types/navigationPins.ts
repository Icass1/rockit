import type { TMediaWithSearch } from "@rockit/shared";

export type NavigationPinsStatus = "idle" | "loading" | "ready" | "error";
export type PinnableMedia = Extract<
    TMediaWithSearch,
    { type: "album" | "playlist" | "artist" }
>;

export type RockitListKey =
    "liked" | "most-listened" | "recent-mix" | "last-month" | "year-recap";
