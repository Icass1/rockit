import { BasePlaylistWithoutMediasResponse } from "@rockit/packages/dto";
import {
    AddMediaToPlaylistRequestSchema,
    API_ENDPOINTS,
    BaseSongWithAlbumResponse,
    BaseSongWithAlbumResponseSchema,
    BaseVideoResponseSchema,
    OkResponseSchema,
    TMedia,
    UserPlaylistsResponseSchema,
} from "@rockit/shared";
import { EEvent } from "@/models/enums/events";
import { rockIt } from "@/lib/rockit/rockIt";
import { apiFetch, apiPostFetch } from "@/lib/utils/apiFetch";

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
        return await apiFetch(
            API_ENDPOINTS.userPlaylists,
            UserPlaylistsResponseSchema
        );
    }

    async addMediaToPlaylist(
        media: TMedia,
        playlist: BasePlaylistWithoutMediasResponse
    ) {
        return await apiPostFetch(
            `/default/playlist/${playlist.publicId}/media`,
            AddMediaToPlaylistRequestSchema,
            OkResponseSchema,
            {
                mediaPublicId: media.publicId,
            }
        );
    }

    async addMediaToPlaylist(
        media: TMedia,
        playlist: BasePlaylistWithoutMediasResponse
    ) {
        return await apiPostFetch(
            `/default/playlist/${playlist.publicId}/media`,
            AddMediaToPlaylistRequestSchema,
            OkResponseSchema,
            {
                mediaPublicId: media.publicId,
            }
        );
    }

    async addUrlToPlaylistAsync(
        url: string,
        playlistPublicId?: string
    ): Promise<void> {
        const query = playlistPublicId
            ? `?url=${url}&playlist_public_id=${playlistPublicId}`
            : `?url=${url}`;

        const media = await apiFetch(
            `/media/url/add${query}`,
            BaseSongWithAlbumResponseSchema.or(BaseVideoResponseSchema)
        );

        if (media.isOk()) {
            rockIt.notificationManager.notifyInfo("Media added successfully!");

            if (playlistPublicId) {
                rockIt.eventManager.dispatchEvent(EEvent.MediaAddedToPlaylist, {
                    publicId: media.result.publicId,
                    playlistPublicId,
                });
            }
        } else {
            rockIt.notificationManager.notifyError("Failed to add media.");
            console.error(
                "Error adding media to playlist",
                media.message,
                media.detail
            );
        }
    }
}
