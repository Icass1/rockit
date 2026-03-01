import {
    BaseAlbumWithSongsResponseSchema,
    BasePlaylistResponseSchema,
    BaseSongWithAlbumResponseSchema,
} from "@/dto";
import apiFetch from "@/lib/utils/apiFetch";

export async function getAlbumAsync(publicId: string) {
    const response = await apiFetch(`/media/album/${publicId}`, {
        auth: false,
    });
    if (!response?.ok) {
        throw "Error fetching album.";
    }

    const responseJson = await response.json();

    return BaseAlbumWithSongsResponseSchema.parse(responseJson);
}

export async function getSongAsync(publicId: string) {
    const response = await apiFetch(`/media/song/${publicId}`, {
        auth: false,
    });
    if (!response?.ok) {
        throw "Error fetching song.";
    }

    const responseJson = await response.json();

    return BaseSongWithAlbumResponseSchema.parse(responseJson);
}

export async function getPlaylistAsync(publicId: string) {
    const response = await apiFetch(`/media/playlist/${publicId}`, {
        auth: false,
    });
    if (!response?.ok) {
        throw "Error fetching playlist.";
    }

    const responseJson = await response.json();

    return BasePlaylistResponseSchema.parse(responseJson);
}
