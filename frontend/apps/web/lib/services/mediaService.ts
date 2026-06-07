import {
    BaseAlbumWithSongsResponse,
    BaseArtistResponse,
    BasePlaylistWithMediasResponse,
    BaseSongWithAlbumResponse,
} from "@/dto";
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
        console.error("Error getting featured list", response.message, response.detail);
    }
    return undefined;
}
