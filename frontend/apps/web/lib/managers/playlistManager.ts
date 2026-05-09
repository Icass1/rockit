import {
    BasePlaylistWithoutMediasResponse,
    BaseSongWithAlbumResponse,
    Http,
    TMedia,
} from "@rockit/shared";
import { EEvent } from "@/models/enums/events";
import { rockIt } from "@/lib/rockit/rockIt";

export class PlaylistManager {
    async playPlaylist(
        songs: BaseSongWithAlbumResponse[],
        listPublicId: string,
        startSongPublicId?: string
    ) {
        rockIt.queueManager.setMedia(songs, listPublicId);

        if (startSongPublicId) {
            rockIt.queueManager.moveToMedia(startSongPublicId);
        } else {
            rockIt.queueManager.setQueueMediaId(0);
        }

        rockIt.mediaPlayerManager.play();
    }

    async getUserPlaylistsAsync() {
        return await Http.getUserPlaylistsAsync();
    }

    async addMediaToPlaylist(
        media: TMedia,
        playlist: BasePlaylistWithoutMediasResponse
    ) {
        return await Http.addMediaToPlaylistAsync(playlist.publicId, {
            mediaPublicId: media.publicId,
        });
    }

    async removeMediaFromPlaylist(
        media: TMedia,
        playlist: BasePlaylistWithoutMediasResponse
    ) {
        return await Http.removeMediaFromPlaylistAsync(
            playlist.publicId,
            media.publicId
        );
    }

    async addUrlToPlaylistAsync(
        url: string,
        playlistPublicId?: string
    ): Promise<void> {
        const mediaRes = await Http.addFromUrl({
            url,
            playlistPublicId: playlistPublicId ?? null,
        });

        if (!mediaRes.isOk()) {
            rockIt.notificationManager.notifyError("Failed to add media.");
            console.error(
                "Error adding media to playlist",
                mediaRes.message,
                mediaRes.detail
            );
            return;
        }

        const media = mediaRes.result.data;

        if (playlistPublicId) {
            const addRes = await Http.addMediaToPlaylistAsync(playlistPublicId, {
                mediaPublicId: media.publicId,
            });

            if (addRes.isOk()) {
                rockIt.notificationManager.notifyInfo(
                    "Media added successfully!"
                );
                rockIt.eventManager.dispatchEvent(
                    EEvent.MediaAddedToPlaylist,
                    {
                        publicId: media.publicId,
                        playlistPublicId,
                    }
                );
            } else {
                rockIt.notificationManager.notifyError(
                    "Failed to add media."
                );
            }
        } else {
            rockIt.notificationManager.notifyInfo("Media added successfully!");
        }
    }
}
