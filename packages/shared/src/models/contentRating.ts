export type ContentRatingValue = "explicit" | "clean" | "unknown";

export const CONTENT_RATING_OPTIONS = [
    { value: "unknown", label: "CONTENT_RATING_UNKNOWN" },
    { value: "explicit", label: "CONTENT_RATING_EXPLICIT" },
    { value: "clean", label: "CONTENT_RATING_CLEAN" },
] as const;

export function getContentRatingValue(media: {
    explicit?: boolean | null;
}): ContentRatingValue {
    return media.explicit === true
        ? "explicit"
        : media.explicit === false
          ? "clean"
          : "unknown";
}
