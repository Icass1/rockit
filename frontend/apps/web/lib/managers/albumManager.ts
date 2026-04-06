import { BaseSongWithAlbumResponse } from "@/dto";
import { QueueListType } from "@/models/types/rockIt";
import { rockIt } from "@/lib/rockit/rockIt";

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
