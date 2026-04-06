import {
    BaseAlbumWithSongsResponse,
    BaseArtistResponse,
    BasePlaylistResponse,
    BaseSongWithAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
} from "../../dto";

export type PlayableMediaType =
    | BaseSongWithAlbumResponse
    | BaseVideoResponse
    | BaseStationResponse;

export type ListMediaType = BasePlaylistResponse | BaseAlbumWithSongsResponse;
export type MediaType = PlayableMediaType | ListMediaType;
export type DownloadableMediaType =
    | BaseSongWithAlbumResponse
    | BaseVideoResponse;

export function isPlayable(media: MediaType): media is PlayableMediaType {
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

export function isDownloadable(
    media: MediaType
): media is DownloadableMediaType {
    switch (media.type) {
        case "song":
            return true;
        case "video":
            return true;
    }
    return false;
}

export function isList(media: MediaType): media is ListMediaType {
    switch (media.type) {
        case "playlist":
            return true;
        case "album":
            return true;
    }
    return false;
}
export function isSong(
    media: PlayableMediaType
): media is BaseSongWithAlbumResponse {
    return media.type === "song";
}

export function isVideo(media: PlayableMediaType): media is BaseVideoResponse {
    return media.type === "video";
}

export function isStation(
    media: PlayableMediaType
): media is BaseStationResponse {
    return media.type === "station";
}

export function getMediaDuration(
    media: PlayableMediaType | undefined
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
    media: PlayableMediaType | undefined
): BaseArtistResponse[] | undefined {
    if (!media) return undefined;
    if (isSong(media) || isVideo(media)) {
        return media.artists;
    }
    return undefined;
}

export function getMediaAudioSrc(
    media: PlayableMediaType | undefined
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
