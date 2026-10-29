import { isSearchResult, type TMediaWithSearch } from "@rockit/shared";
import type { PinnableMedia } from "@/models/types/navigationPins";

export function isPinnableMedia(
    media: TMediaWithSearch
): media is PinnableMedia {
    return (
        !isSearchResult(media) &&
        !!media.publicId &&
        (media.type === "album" ||
            media.type === "playlist" ||
            (media.type === "artist" && media.url.startsWith("/artist/")))
    );
}
