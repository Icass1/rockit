import { BaseSongWithAlbumResponse } from "@/dto";
import { QueueListType } from "@/types/rockIt";
import { rockIt } from "@/lib/rockit/rockIt";

export class PlaylistManager {
    // #region: Constructor

    constructor() {}

    // #endregion

    // #region: Methods

    async playPlaylist(
        songs: BaseSongWithAlbumResponse[],
        listType: QueueListType,
        listPublicId: string,
        startSongPublicId?: string
    ) {
        rockIt.queueManager.setMedia(songs, listType, listPublicId);

        if (startSongPublicId)
            rockIt.queueManager.moveToMedia(startSongPublicId);
        else rockIt.queueManager.setQueueMediaId(0);

        rockIt.audioManager.play();
    }

    // #endregion
}
