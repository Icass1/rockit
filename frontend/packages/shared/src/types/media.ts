import {
    BaseSongWithAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
} from "../dto";

export type MediaType =
    | BaseSongWithAlbumResponse
    | BaseVideoResponse
    | BaseStationResponse;

export function isSong(media: MediaType): media is BaseSongWithAlbumResponse {
    return media.type === "song";
}

export function isVideo(media: MediaType): media is BaseVideoResponse {
    return media.type === "video";
}

export function isStation(media: MediaType): media is BaseStationResponse {
    return media.type === "station";
}

export function getMediaDuration(
    media: MediaType | undefined
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

export function getMediaArtists(media: MediaType | undefined):
    | {
          provider: string;
          publicId: string;
          url: string;
          name: string;
          imageUrl: string;
      }[]
    | undefined {
    if (!media) return undefined;
    if (isSong(media) || isVideo(media)) {
        return media.artists;
    }
    return undefined;
}

export function getMediaAudioSrc(
    media: MediaType | undefined
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
