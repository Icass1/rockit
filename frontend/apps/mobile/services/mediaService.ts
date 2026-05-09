import {
    BaseAlbumWithSongsResponse,
    BaseAlbumWithSongsResponseSchema,
    BasePlaylistWithMediasResponse,
    BasePlaylistWithMediasResponseSchema,
} from "@/shared/dto";
import { apiFetch } from "@/lib/api";

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

export async function getPlaylistAsync(
    publicId: string
): Promise<BasePlaylistWithMediasResponse | undefined> {
    const response = await apiFetch(
        `/media/playlist/${publicId}`,
        BasePlaylistWithMediasResponseSchema
    );
    console.log(response);

    if (response.isOk()) {
        return response.result;
    } else {
        console.error("Error getting album", response.message, response.detail);
    }
}
