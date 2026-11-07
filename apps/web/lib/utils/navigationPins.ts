import {
    isSearchResult,
    type NavigationPinResponse,
    type TMediaWithSearch,
    type Vocabulary,
} from "@rockit/shared";
import type {
    PinnableMedia,
    RockitListKey,
} from "@/models/types/navigationPins";

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

export function getRockitListName(
    key: string,
    vocabulary: Vocabulary,
    fallback: string = key
): string {
    const names: Record<RockitListKey, string> = {
        liked: vocabulary.LIKED_SONGS,
        "most-listened": vocabulary.MOST_LISTENED,
        "recent-mix": vocabulary.RECENT_MIX,
        "last-month": vocabulary.NAV_LAST_MONTH,
        "year-recap": vocabulary.NAV_YEAR_RECAP,
    };
    return Object.hasOwn(names, key) ? names[key as RockitListKey] : fallback;
}
