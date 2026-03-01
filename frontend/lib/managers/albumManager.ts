import { BaseSongWithAlbumResponse } from "@/dto";
import { QueueListType } from "@/types/rockIt";
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
        rockIt.queueManager.setSongs(songs, listType, listPublicId);

        if (startSongPublicId)
            rockIt.queueManager.moveToSong(startSongPublicId);
        else rockIt.queueManager.setQueueSongId(0);

        rockIt.audioManager.play();
    }
}
