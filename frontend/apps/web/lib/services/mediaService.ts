import {
    BaseAlbumWithSongsResponse,
    BaseAlbumWithSongsResponseSchema,
    BasePlaylistResponse,
    BasePlaylistResponseSchema,
    BaseSongWithAlbumResponse,
    BaseSongWithAlbumResponseSchema,
} from "@/dto";
import { apiFetch } from "@/lib/utils/apiFetch";

export async function getAlbumAsync(
    publicId: string
): Promise<BaseAlbumWithSongsResponse | undefined> {
    const response = await apiFetch(
        `/media/album/${publicId}`,
        BaseAlbumWithSongsResponseSchema
    );

    if (response.isOk()) {
        return response.result;
    } else {
        console.error("Error getting album", response.message, response.detail);
    }
}

export async function getSongAsync(
    publicId: string
): Promise<BaseSongWithAlbumResponse | undefined> {
    const response = await apiFetch(
        `/media/song/${publicId}`,
        BaseSongWithAlbumResponseSchema
    );
    if (response.isOk()) {
        return response.result;
    } else {
        console.error("Error getting album", response.message, response.detail);
    }
}

export async function getPlaylistAsync(
    publicId: string
): Promise<BasePlaylistResponse | undefined> {
    const response = await apiFetch(
        `/media/playlist/${publicId}`,
        BasePlaylistResponseSchema
    );
    if (response.isOk()) {
        return response.result;
    } else {
        console.error("Error getting album", response.message, response.detail);
    }
}
