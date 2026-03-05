import {
    BaseAlbumWithSongsResponseSchema,
    BasePlaylistResponseSchema,
    BaseSongWithAlbumResponseSchema,
} from "@/dto";
import { baseApiFetch } from "@/lib/utils/apiFetch";

export async function getAlbumAsync(publicId: string) {
    const response = await baseApiFetch(`/media/album/${publicId}`, {
        auth: false,
    });
    if (!response?.ok) {
        throw "Error fetching album.";
    }

    const responseJson = await response.json();

    return BaseAlbumWithSongsResponseSchema.parse(responseJson);
}

export async function getSongAsync(publicId: string) {
    const response = await baseApiFetch(`/media/song/${publicId}`, {
        auth: false,
    });
    if (!response?.ok) {
        throw "Error fetching song.";
    }

    const responseJson = await response.json();

    return BaseSongWithAlbumResponseSchema.parse(responseJson);
}

export async function getPlaylistAsync(publicId: string) {
    const response = await baseApiFetch(`/media/playlist/${publicId}`, {
        auth: false,
    });
    if (!response?.ok) {
        throw "Error fetching playlist.";
    }

    const responseJson = await response.json();

    return BasePlaylistResponseSchema.parse(responseJson);
}
