import { BasePlaylistResponseSchema, BaseSongWithAlbumResponse } from "@/dto";
import { QueueListType } from "@/types/rockIt";
import { rockIt } from "@/lib/rockit/rockIt";
import apiFetch from "@/lib/utils/apiFetch";

export class PlaylistManager {
    // #region: Constructor

    constructor() {}

    // #endregion

    // #region: Methods

    async getPlaylistAsync(publicId: string) {
        const response = await apiFetch(`/playlist/${publicId}`, {
            auth: false,
        });
        if (!response?.ok) {
            throw "Error fetching playlist.";
        }

        const responseJson = await response.json();

        return BasePlaylistResponseSchema.parse(responseJson);
    }

    async playPlaylist(
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

    // #endregion
}
