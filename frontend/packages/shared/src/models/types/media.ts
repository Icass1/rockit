import {
    BaseAlbumWithoutSongsResponse,
    BaseAlbumWithSongsResponse,
    BaseArtistResponse,
    BasePlaylistForPlaylistResponse,
    BasePlaylistWithMediasResponse,
    BasePlaylistWithoutMediasResponse,
    BaseSearchResultsItem,
    BaseSongWithAlbumResponse,
    BaseSongWithoutAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
} from "@/dto";

export type TPlayableMedia =
    | BaseSongWithAlbumResponse
    | BaseSongWithoutAlbumResponse
    | BaseVideoResponse
    | BaseStationResponse;

export type TQueueMedia =
    | BaseSongWithAlbumResponse
    | BaseSongWithoutAlbumResponse
    | BaseVideoResponse
    | BaseStationResponse;

export type TListMedia =
    | BasePlaylistWithMediasResponse
    | BasePlaylistWithoutMediasResponse
    | BasePlaylistForPlaylistResponse
    | BaseAlbumWithSongsResponse
    | BaseAlbumWithoutSongsResponse;

export type DownloadableMediaType =
    | BaseSongWithAlbumResponse
    | BaseSongWithoutAlbumResponse
    | BaseVideoResponse;

export type TMediaWithSearch =
    | TPlayableMedia
    | TListMedia
    | BaseSearchResultsItem
    | BaseArtistResponse;

export type TMedia = TPlayableMedia | TListMedia | BaseArtistResponse;

export function isQueueable(media: TMedia): media is TQueueMedia {
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

export function isPlaylistWithMedias(
    media: TMedia
): media is BasePlaylistWithMediasResponse | BasePlaylistForPlaylistResponse {
    return (
        media.type === "playlist" &&
        (
            media as
                | BasePlaylistWithMediasResponse
                | BasePlaylistForPlaylistResponse
        ).medias !== undefined
    );
}

export function isPlaylist(
    media: TMedia
): media is
    | BasePlaylistWithoutMediasResponse
    | BasePlaylistForPlaylistResponse
    | BasePlaylistWithMediasResponse {
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
    | BasePlaylistWithMediasResponse
    | BasePlaylistWithoutMediasResponse
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

export function isStation(
    media: TMedia | BaseSearchResultsItem
): media is BaseStationResponse {
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

export function getTotalDuration(media: TMedia[]): number {
    return getAllPlayableMedia(media).reduce((sum, item) => {
        if (isSong(item)) return sum + item.duration_ms;
        if (isVideo(item) && item.duration_ms) return sum + item.duration_ms;
        return sum;
    }, 0);
}

export type DurationStyle = "normal" | "minutes";

export function formatDuration(
    ms: number,
    style: DurationStyle = "normal"
): string {
    if (style === "minutes") {
        return `${Math.round(ms / 60000)} min`;
    }

    const totalMinutes = Math.round(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
        return `${minutes} min`;
    }

    const paddedMinutes = String(minutes).padStart(2, "0");
    return `${hours} h ${paddedMinutes} min`;
}

function buildSongCountWithDuration(count: number, durationMs: number): string {
    const label = `${count} song${count !== 1 ? "s" : ""}`;
    if (durationMs === 0) return label;
    return `${label} • ${formatDuration(durationMs)}`;
}

export function getMediaSubtitle(media: TMediaWithSearch): string {
    if (isSearchResult(media)) {
        return media.artists.map((artist): string => artist.name).join(", ");
    } else if (isSongWithAlbum(media)) {
        return (
            media.artists.map((artist): string => artist.name).join(", ") +
            " | " +
            media.album.name
        );
    } else if (isSong(media)) {
        return media.artists.map((artist): string => artist.name).join(", ");
    } else if (isAlbumWithSongs(media)) {
        const totalSongs = media.songs.length ?? 0;
        const totalMs = getTotalDuration(media.songs);
        return buildSongCountWithDuration(totalSongs, totalMs);
    } else if (isPlaylistWithMedias(media)) {
        if (media.description) {
            const totalMs = getTotalDuration(media.medias.map((m) => m.item));
            if (totalMs > 0) {
                return `${media.description} • ${formatDuration(totalMs)}`;
            }
            return media.description;
        }
        const totalSongs = media.medias?.length ?? 0;
        const totalMs = getTotalDuration(media.medias.map((m) => m.item));
        return buildSongCountWithDuration(totalSongs, totalMs);
    } else if (isPlaylist(media)) {
        return media.description ?? "";
    } else if (isVideo(media)) {
        return media.artists.map((artist): string => artist.name).join(", ");
    } else if (isStation(media)) {
        return media.country ?? media.tags ?? "Radio Station";
    }
    return "Not supported subtitle";
}

export function getMediaArtists(
    media: TMedia | undefined
): BaseArtistResponse[] {
    if (!media) return [];
    if (isSong(media) || isVideo(media)) {
        return media.artists;
    } else if (isAlbum(media)) {
        return media.artists;
    }
    return [];
}

export function getMediaArtistsString(
    media: TMediaWithSearch | undefined
): string {
    if (!media) return "";
    if (isSearchResult(media))
        return media.artists.map((a) => a.name).join(", ");
    return getMediaArtists(media)
        .map((artist) => artist.name)
        .join(", ");
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

export function getMediaAudioUrl(
    media: TPlayableMedia | undefined
): string | undefined {
    if (!media) return undefined;
    if (isSong(media)) {
        return media.audioUrl ?? undefined;
    }
    if (isVideo(media)) {
        return media.audioUrl ?? undefined;
    }
    if (isStation(media)) {
        return media.streamUrl ?? undefined;
    }
    return undefined;
}

export function getMediaVideoUrl(
    media: TPlayableMedia | undefined
): string | undefined {
    if (!media) return undefined;
    if (isVideo(media)) {
        return media.videoUrl ?? undefined;
    }
    return undefined;
}

export function getAllPlayableMedia(medias: TMedia[]): TPlayableMedia[] {
    const mediaList: TPlayableMedia[] = [];

    medias.forEach((media): void => {
        if (isPlaylistWithMedias(media)) {
            mediaList.push(
                ...getAllPlayableMedia(
                    media.medias.map((media): TMedia => media.item)
                )
            );
        } else if (isAlbumWithSongs(media)) {
            mediaList.push(...getAllPlayableMedia(media.songs));
        } else if (isPlayable(media)) {
            mediaList.push(media);
        } else {
            console.error(
                "Unkown media type in getAllPlayableMedia",
                media.type
            );
        }
    });

    return mediaList;
}
