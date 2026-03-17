import { BaseSongWithAlbumResponse } from "@/packages/dto";
import { rockIt } from "@/packages/lib/rockit/rockIt";
import { QueueListType } from "@/packages/types/rockIt";

export class AlbumManager {
    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    static async playAlbum(
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
}
