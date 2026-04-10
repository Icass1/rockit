import {
    BaseAlbumWithSongsResponse,
    BaseAlbumWithSongsResponseSchema,
    BasePlaylistResponse,
    BasePlaylistResponseSchema,
    BaseSongWithAlbumResponse,
    BaseSongWithAlbumResponseSchema,
} from "../dto";
import { BACKEND_URL } from "../environment";

type ZodSchema<T> = {
    parse: (data: unknown) => T;
};

async function apiFetch<T>(path: string, schema: ZodSchema<T>): Promise<T> {
    const response = await fetch(`${BACKEND_URL}${path}`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });
    const json = await response.json();
    return schema.parse(json);
}

export async function getAlbumAsync(
    publicId: string
): Promise<BaseAlbumWithSongsResponse | null> {
    try {
        const response = await apiFetch(
            `/media/album/${publicId}`,
            BaseAlbumWithSongsResponseSchema
        );
        return response;
    } catch (error) {
        console.error("Error getting album:", error);
        return null;
    }
}

export async function getSongAsync(
    publicId: string
): Promise<BaseSongWithAlbumResponse | null> {
    try {
        const response = await apiFetch(
            `/media/song/${publicId}`,
            BaseSongWithAlbumResponseSchema
        );
        return response;
    } catch (error) {
        console.error("Error getting song:", error);
        return null;
    }
}

export async function getPlaylistAsync(
    publicId: string
): Promise<BasePlaylistResponse | null> {
    try {
        const response = await apiFetch(
            `/media/playlist/${publicId}`,
            BasePlaylistResponseSchema
        );
        return response;
    } catch (error) {
        console.error("Error getting playlist:", error);
        return null;
    }
}
