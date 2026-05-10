import {
    BaseAlbumWithSongsResponse,
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
}

export async function getPlaylistAsync(
    publicId: string
): Promise<BasePlaylistWithMediasResponse | undefined> {
    const response = await Http.getPlaylist(publicId);
    console.log(response);

    if (response.isOk()) {
        return response.result;
    } else {
        console.error("Error getting album", response.message, response.detail);
    }
}
