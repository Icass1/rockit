import { BaseSongWithAlbumResponse, QueueListType } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";

export class PlaylistManager {
    static async playPlaylist(
        songs: BaseSongWithAlbumResponse[],
        listType: QueueListType,
        listPublicId: string,
        startSongPublicId?: string
    ) {
        rockIt.queueManager.setMedia(songs, listType, listPublicId);

        if (startSongPublicId) {
            rockIt.queueManager.moveToMedia(startSongPublicId);
        } else {
            rockIt.queueManager.setQueueMediaId(0);
        }

        rockIt.audioManager.play();
    }
}
