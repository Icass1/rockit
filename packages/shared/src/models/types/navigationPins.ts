import type { TMediaWithSearch } from "@/models/types/media";

export type NavigationPinsStatus = "idle" | "loading" | "ready" | "error";

export type PinnableMedia = Extract<
    TMediaWithSearch,
    { type: "album" | "playlist" | "artist" }
>;
export type RockitListKey =
    import("@/models/interfaces/featuredCollection").FeaturedCollectionKey;
