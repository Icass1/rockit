import {
    BasePlaylistWithoutMediasResponse,
    BaseSongWithAlbumResponse,
    EEvent,
    EWebSocketMessage,
    HttpResult,
    TMedia,
    type MediaAddedToPlaylistMessage,
    type PlaylistCreatedMessage,
    type PlaylistDeletedMessage,
    type PlaylistRenamedMessage,
} from "@rockit/shared";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom, ReadonlyArrayAtom } from "@/lib/store";

export class PlaylistManager {
    private _playlistsAtom = createArrayAtom<BasePlaylistWithoutMediasResponse>(
        []
    );
    private _init = false;

    get playlistsAtom(): ReadonlyArrayAtom<BasePlaylistWithoutMediasResponse> {
        return this._playlistsAtom.getReadonlyAtom();
    }

    async init(): Promise<void> {
        console.log("PlaylistManager init", this._init);
        if (this._init) return;
        this._init = true;

        await this.refreshPlaylistsAsync();

        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.PlaylistCreated,
            this.handlePlaylistCreated
        );
        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.PlaylistRenamed,
            this.handlePlaylistRenamed
        );
        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.PlaylistDeleted,
            this.handlePlaylistDeleted
        );
        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.MediaAddedToPlaylist,
            this.handleMediaAddedToPlaylist
        );
    }

    private handlePlaylistCreated = async (
        data: PlaylistCreatedMessage
    ): Promise<void> => {
        rockIt.eventManager.dispatchEvent(EEvent.PlaylistCreated, {
            publicId: data.publicId,
        });
        await this.refreshPlaylistsAsync();
    };

    private handlePlaylistRenamed = async (
        data: PlaylistRenamedMessage
    ): Promise<void> => {
        rockIt.eventManager.dispatchEvent(EEvent.PlaylistRenamed, {
            publicId: data.publicId,
            name: data.name,
        });
        await this.refreshPlaylistsAsync();
    };

    private handlePlaylistDeleted = async (
        data: PlaylistDeletedMessage
    ): Promise<void> => {
        rockIt.eventManager.dispatchEvent(EEvent.PlaylistDeleted, {
            publicId: data.publicId,
        });
        await this.refreshPlaylistsAsync();
    };

    private handleMediaAddedToPlaylist = async (
        data: MediaAddedToPlaylistMessage
    ): Promise<void> => {
        rockIt.eventManager.dispatchEvent(EEvent.MediaAddedToPlaylist, {
            publicId: data.publicId,
            playlistPublicId: data.playlistPublicId,
            position: data.position,
        });
    };

    private async refreshPlaylistsAsync(): Promise<void> {
        const result = await Http.getUserPlaylistsAsync();
        if (result.isOk()) {
            this._playlistsAtom.set(result.result.playlists);
        }
    }

    async playPlaylist(
        songs: BaseSongWithAlbumResponse[],
        listPublicId: string,
        startSongPublicId?: string
    ): Promise<void> {
        rockIt.queueManager.setMedia(songs, listPublicId);

        if (startSongPublicId) {
            rockIt.queueManager.moveToMedia(startSongPublicId);
        } else {
            rockIt.queueManager.setQueueMediaId(0);
        }

        rockIt.mediaPlayerManager.play();
    }

    async addMediaToPlaylist(
        media: TMedia,
        playlist: BasePlaylistWithoutMediasResponse
    ): Promise<HttpResult<{ status: string }>> {
        return await Http.addMediaToPlaylistAsync(playlist.publicId, {
            mediaPublicId: media.publicId,
        });
    }

    async removeMediaFromPlaylist(
        media: TMedia,
        playlist: BasePlaylistWithoutMediasResponse
    ): Promise<HttpResult<{ status: string }>> {
        return await Http.removeMediaFromPlaylistAsync(
            playlist.publicId,
            media.publicId
        );
    }

    async removeMediaFromPlaylistByPublicId(
        mediaPublicId: string,
        playlistPublicId: string
    ): Promise<HttpResult<{ status: string }>> {
        const res = await Http.removeMediaFromPlaylistAsync(
            playlistPublicId,
            mediaPublicId
        );
        if (res.isNotOk()) {
            rockIt.notificationManager.notifyError(res.message);
        }
        return res;
    }

    async addUrlToPlaylistAsync(
        url: string,
        playlistPublicId: string
    ): Promise<void> {
        const mediaRes = await Http.addFromUrl({
            url,
            addToPlaylist: true,
            addToLibrary: false,
            playlistPublicId: playlistPublicId,
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
        if (mediaRes.isOk()) {
            rockIt.notificationManager.notifySuccess(
                `"${mediaRes.result.data.name}" ${rockIt.vocabularyManager.vocabulary.ADDED_TO_PLAYLIST}`
            );
        }
    }
}
