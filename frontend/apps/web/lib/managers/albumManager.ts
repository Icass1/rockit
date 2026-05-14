import { BaseSongWithAlbumResponse } from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";

export class AlbumManager {
    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    static async playAlbum(
        songs: BaseSongWithAlbumResponse[],
        listPublicId: string,
        startSongPublicId?: string
    ): Promise<void> {
        rockIt.queueManager.setMedia(songs, listPublicId);

        if (startSongPublicId)
            rockIt.queueManager.moveToMedia(startSongPublicId);
        else rockIt.queueManager.setQueueMediaId(0);

        rockIt.mediaPlayerManager.play();
    }
}
