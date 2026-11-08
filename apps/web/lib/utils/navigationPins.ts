import {
    getRockitListName,
    isSearchResult,
    type NavigationPinResponse,
    type TMediaWithSearch,
    type Vocabulary,
} from "@rockit/shared";
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

export function getNavigationPinName(
    pin: NavigationPinResponse,
    vocabulary: Vocabulary
): string {
    return pin.builtinKey
        ? getRockitListName(pin.builtinKey, vocabulary, pin.name)
        : pin.name;
}

export { getRockitListName };
