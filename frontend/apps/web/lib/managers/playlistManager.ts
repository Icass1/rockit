import {
    BaseSongWithAlbumResponse,
    BaseSongWithAlbumResponseSchema,
    BaseVideoResponseSchema,
    QueueListType,
} from "@rockit/shared";
import { EEvent } from "@/models/enums/events";
import { rockIt } from "@/lib/rockit/rockIt";
import { apiFetch } from "@/lib/utils/apiFetch";

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

        rockIt.mediaPlayerManager.play();
    }

    static async addMediaToPlaylistAsync(
        url: string,
        playlistPublicId?: string
    ): Promise<void> {
        const query = playlistPublicId
            ? `?url=${url}&playlist_public_id=${playlistPublicId}`
            : `?url=${url}`;

        try {
            const media = await apiFetch(
                `/media/url/add${query}`,
                BaseSongWithAlbumResponseSchema.or(BaseVideoResponseSchema)
            );

            rockIt.notificationManager.notifyInfo("Media added successfully!");

            if (playlistPublicId) {
                rockIt.eventManager.dispatchEvent(EEvent.MediaAddedToPlaylist, {
                    publicId: media.publicId,
                    playlistPublicId,
                });
            }
        } catch {
            rockIt.notificationManager.notifyError("Failed to add media.");
        }
    }
}
