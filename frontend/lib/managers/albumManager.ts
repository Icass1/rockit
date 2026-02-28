import {
    BaseAlbumWithSongsResponseSchema,
    BaseSongWithAlbumResponse,
    BaseSongWithoutAlbumResponse,
} from "@/dto";
import { QueueListType } from "@/types/rockIt";
import { rockIt } from "@/lib/rockit/rockIt";
import apiFetch from "@/lib/utils/apiFetch";

export class AlbumManager {
    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    async getAlbumAsync(publicId: string) {
        const response = await apiFetch(`/album/${publicId}`, {
            auth: false,
        });
        if (!response?.ok) {
            throw "Error fetching album.";
        }

        const responseJson = await response.json();

        return BaseAlbumWithSongsResponseSchema.parse(responseJson);
    }

    async playAlbum(
        songs: BaseSongWithAlbumResponse[],
        listType: QueueListType,
        listPublicId: string,
        startSongPublicId?: string
    ) {
        rockIt.queueManager.setSongs(songs, listType, listPublicId);

        if (startSongPublicId)
            rockIt.queueManager.moveToSong(startSongPublicId);
        else rockIt.queueManager.setQueueSongId(0);

        rockIt.audioManager.play();
    }
}
