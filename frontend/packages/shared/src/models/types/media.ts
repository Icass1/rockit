import {
    BaseAlbumWithSongsResponse,
    BaseArtistResponse,
    BasePlaylistResponse,
    BaseSongWithAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
} from "../../dto";

export type TPlayableMedia =
    | BaseSongWithAlbumResponse
    | BaseVideoResponse
    | BaseStationResponse;

export type TListMedia = BasePlaylistResponse | BaseAlbumWithSongsResponse;
export type TMedia = TPlayableMedia | TListMedia;
export type DownloadableMediaType =
    | BaseSongWithAlbumResponse
    | BaseVideoResponse;

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
    media: TPlayableMedia
): media is BaseSongWithAlbumResponse {
    return media.type === "song";
}

export function isVideo(media: TPlayableMedia): media is BaseVideoResponse {
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

export function getMediaArtists(
    media: TPlayableMedia | undefined
): BaseArtistResponse[] | undefined {
    if (!media) return undefined;
    if (isSong(media) || isVideo(media)) {
        return media.artists;
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
