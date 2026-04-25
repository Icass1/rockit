import {
    BaseAlbumWithoutSongsResponse,
    BaseAlbumWithSongsResponse,
    BaseArtistResponse,
    BasePlaylistForPlaylistResponse,
    BasePlaylistResponse,
    BaseSearchResultsItem,
    BaseSongWithAlbumResponse,
    BaseSongWithoutAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
} from "../../dto";

export type TPlayableMedia =
    | BaseSongWithAlbumResponse
    | BaseSongWithoutAlbumResponse
    | BaseVideoResponse
    | BaseStationResponse;

export type TQueueMedia =
    | BaseSongWithAlbumResponse
    | BaseSongWithoutAlbumResponse
    | BaseVideoResponse;

export type TListMedia =
    | BasePlaylistResponse
    | BasePlaylistForPlaylistResponse
    | BaseAlbumWithSongsResponse
    | BaseAlbumWithoutSongsResponse
    | BaseArtistResponse;

export type DownloadableMediaType =
    | BaseSongWithAlbumResponse
    | BaseSongWithoutAlbumResponse
    | BaseVideoResponse;

export type TMediaWithSearch =
    | TPlayableMedia
    | TListMedia
    | BaseSearchResultsItem;

export type TMedia = TPlayableMedia | TListMedia;

export function isQueueable(media: TMedia): media is TQueueMedia {
    switch (media.type) {
        case "song":
            return true;
        case "video":
            return true;
    }
    return false;
}

export function isPlayable(media: TMedia): media is TPlayableMedia {
    switch (media.type) {
        case "song":
            return true;
        case "video":
            return true;
        case "station":
            return true;
    }
    return false;
}

export function isSearchResult(
    media: TMediaWithSearch
): media is BaseSearchResultsItem {
    if ((media as BaseSearchResultsItem)?.searchResult) return true;
    return false;
}

export function isDownloadable(media: TMedia): media is DownloadableMediaType {
    switch (media.type) {
        case "song":
            return true;
        case "video":
            return true;
    }
    return false;
}

export function isList(media: TMedia): media is TListMedia {
    switch (media.type) {
        case "playlist":
            return true;
        case "album":
            return true;
    }
    return false;
}
export function isSong(
    media: TMedia
): media is BaseSongWithAlbumResponse | BaseSongWithoutAlbumResponse {
    return media.type === "song";
}

export function isAlbum(
    media: TMedia
): media is BaseAlbumWithSongsResponse | BaseAlbumWithoutSongsResponse {
    return media.type === "album";
}

export function isAlbumWithSongs(
    media: TMedia
): media is BaseAlbumWithSongsResponse {
    return (
        media.type === "album" &&
        (media as BaseAlbumWithSongsResponse).songs !== undefined
    );
}

export function isPlaylist(media: TMedia): media is BasePlaylistResponse {
    return media.type === "playlist";
}

export function isSongWithAlbum(
    media: TMedia
): media is BaseSongWithAlbumResponse {
    return (
        media.type === "song" &&
        (media as BaseSongWithAlbumResponse).album !== undefined
    );
}

export function isNavigable(
    media: TMediaWithSearch
): media is
    | BaseAlbumWithSongsResponse
    | BaseAlbumWithoutSongsResponse
    | BasePlaylistResponse
    | BaseArtistResponse {
    if (isSearchResult(media)) return false;
    switch (media.type) {
        case "playlist":
            return true;
        case "album":
            return true;
        case "artist":
            return true;
    }
    return false;
}

export function isVideo(media: TMedia): media is BaseVideoResponse {
    return media.type === "video";
}

export function isStation(media: TPlayableMedia): media is BaseStationResponse {
    return media.type === "station";
}

export function getMediaDuration(
    media: TPlayableMedia | undefined
): number | undefined {
    if (!media) return undefined;
    if (isSong(media)) {
        return media.duration_ms / 1000;
    }
    if (isVideo(media)) {
        return media.duration_ms ? media.duration_ms / 1000 : undefined;
    }
    return undefined;
}

export function getMediaSubtitle(media: TMediaWithSearch): string {
    if (isSearchResult(media)) {
        return media.artists.map((artist) => artist.name).join(", ");
    } else if (isSongWithAlbum(media)) {
        return (
            media.artists.map((artist) => artist.name).join(", ") +
            " | " +
            media.album.name
        );
    } else if (isSong(media)) {
        return media.artists.map((artist) => artist.name).join(", ");
    } else if (isAlbumWithSongs(media)) {
        const totalSongs = media.songs.length ?? 0;
        return `${totalSongs} song${totalSongs !== 1 ? "s" : ""}`;
    } else if (isPlaylist(media)) {
        return (
            media.description ??
            `${media.medias?.length ?? 0} song${
                (media.medias?.length ?? 0) !== 1 ? "s" : ""
            }`
        );
    }
    return "";
}

export function getMediaArtists(
    media: TPlayableMedia | undefined
): BaseArtistResponse[] | undefined {
    if (!media) return undefined;
    if (isSong(media) || isVideo(media)) {
        return media.artists;
    }
    return undefined;
}

export function getMediaAlbum(
    media: TPlayableMedia | undefined
): BaseAlbumWithoutSongsResponse | undefined {
    if (!media) return undefined;
    if (isSongWithAlbum(media)) {
        return media.album;
    }
    return undefined;
}

export function getMediaAudioSrc(
    media: TPlayableMedia | undefined
): string | undefined {
    if (!media) return undefined;
    if (isSong(media)) {
        return media.audioSrc ?? undefined;
    }
    if (isVideo(media)) {
        return media.audioSrc ?? undefined;
    }
    return undefined;
}

export function getMediaVideoSrc(
    media: TPlayableMedia | undefined
): string | undefined {
    if (!media) return undefined;
    if (isVideo(media)) {
        return media.videoSrc ?? undefined;
    }
    return undefined;
}
