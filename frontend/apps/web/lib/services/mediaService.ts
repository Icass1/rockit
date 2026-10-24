import {
    BaseAlbumWithoutSongsResponse,
    BaseAlbumWithSongsResponse,
    BaseArtistResponse,
    BasePlaylistWithMediasResponse,
    BaseSongWithAlbumResponse,
} from "@/dto";
import { isQueueable, type TPlayableMedia } from "@rockit/shared";
import { Http } from "@/lib/http";

// Session-scoped memory cache for full albums/playlists: avoids re-fetching
// the same publicId over and over during one app session (the service worker
// only mitigates repeated requests; this removes them entirely).
const albumCache = new Map<string, BaseAlbumWithSongsResponse>();

export async function getAlbumAsync(
    publicId: string
): Promise<BaseAlbumWithSongsResponse | undefined> {
    const cached = albumCache.get(publicId);
    if (cached) return cached;

    const response = await Http.getAlbum(publicId);

    if (response.isOk()) {
        albumCache.set(publicId, response.result);
        return response.result;
    } else {
        console.error("Error getting album", response.message, response.detail);
    }
    return undefined;
}

export async function getSongAsync(
    publicId: string
): Promise<BaseSongWithAlbumResponse | undefined> {
    const response = await Http.getSong(publicId);
    if (response.isOk()) {
        return response.result;
    } else {
        console.error("Error getting album", response.message, response.detail);
    }
    return undefined;
}

export async function getPlaylistAsync(
    publicId: string
): Promise<BasePlaylistWithMediasResponse | undefined> {
    const response = await Http.getPlaylist(publicId);

    if (response.isOk()) {
        return response.result;
    } else {
        console.error("Error getting album", response.message, response.detail);
    }
    return undefined;
}

export async function getArtistAsync(
    publicId: string
): Promise<BaseArtistResponse | undefined> {
    const response = await Http.getArtist(publicId);

    if (response.isOk()) {
        return response.result;
    } else {
        console.error(
            "Error getting artist",
            response.message,
            response.detail
        );
    }
    return undefined;
}

// Resolve collection contents on the server, including nested collections. Limit
// concurrency so a large library does not flood the API with hundreds of fetches.
async function resolveCollections(
    publicIds: string[],
    onFailure?: (publicId: string) => void
): Promise<TPlayableMedia[]> {
    const results: TPlayableMedia[][] = new Array(publicIds.length);
    let cursor = 0;
    await Promise.all(
        Array.from({ length: Math.min(4, publicIds.length) }, async () => {
            while (cursor < publicIds.length) {
                const index = cursor++;
                try {
                    const response = await Http.resolveCollectionQueue(
                        publicIds[index]
                    );
                    if (!response.isOk()) throw new Error(response.message);
                    results[index] = response.result.queue
                        .map((entry) => entry.media)
                        .filter(isQueueable);
                } catch (error) {
                    results[index] = [];
                    console.error(
                        "Error resolving collection",
                        publicIds[index],
                        error
                    );
                    onFailure?.(publicIds[index]);
                }
            }
        })
    );
    return results.flat();
}

export async function expandAlbumsToPlayable(
    albums: BaseAlbumWithoutSongsResponse[],
    onFailure?: (publicId: string) => void
): Promise<TPlayableMedia[]> {
    return resolveCollections(
        albums.map((album) => album.publicId),
        onFailure
    );
}

export async function expandPlaylistsToPlayable(
    playlists: Array<{ publicId: string }>,
    onFailure?: (publicId: string) => void
): Promise<TPlayableMedia[]> {
    return resolveCollections(
        playlists.map((playlist) => playlist.publicId),
        onFailure
    );
}

export async function getFeaturedListAsync(
    type: "liked" | "most-listened" | "recent-mix" | "last-month" | "year-recap"
): Promise<BasePlaylistWithMediasResponse | undefined> {
    let response;
    switch (type) {
        case "liked":
            response = await Http.getFeaturedLiked();
            break;
        case "most-listened":
            response = await Http.getFeaturedMostListened();
            break;
        case "recent-mix":
            response = await Http.getFeaturedRecentMix();
            break;
        case "last-month":
            response = await Http.getFeaturedLastMonth();
            break;
        case "year-recap":
            response = await Http.getFeaturedYearRecap();
            break;
    }

    if (response.isOk()) {
        return response.result;
    } else {
        console.error(
            "Error getting featured list",
            response.message,
            response.detail
        );
    }
    return undefined;
}
