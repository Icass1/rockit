import {
    BaseAlbumWithSongsResponse,
    BaseAlbumWithoutSongsResponse,
    BaseArtistResponse,
    BasePlaylistWithMediasResponse,
    BasePlaylistWithoutMediasResponse,
    BaseSongWithAlbumResponse,
} from "@/dto";
import { isQueueable, type TPlayableMedia } from "@rockit/shared";
import { Http } from "@/lib/http";

export async function getAlbumAsync(
    publicId: string
): Promise<BaseAlbumWithSongsResponse | undefined> {
    const response = await Http.getAlbum(publicId);

    if (response.isOk()) {
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

export async function expandAlbumsToPlayable(
    albums: BaseAlbumWithoutSongsResponse[]
): Promise<TPlayableMedia[]> {
    const promises = albums.map(async (album) => {
        const full = await getAlbumAsync(album.publicId);
        return full?.songs ?? [];
    });
    const results = await Promise.all(promises);
    return results.flat();
}

export async function expandPlaylistsToPlayable(
    playlists: BasePlaylistWithoutMediasResponse[]
): Promise<TPlayableMedia[]> {
    const promises = playlists.map(async (playlist) => {
        const full = await getPlaylistAsync(playlist.publicId);
        if (!full) return [];
        return full.medias
            .filter((m) => isQueueable(m.item))
            .map((m) => m.item) as TPlayableMedia[];
    });
    const results = await Promise.all(promises);
    return results.flat();
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
