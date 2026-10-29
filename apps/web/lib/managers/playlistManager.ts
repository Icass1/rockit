import {
    BasePlaylistWithoutMediasResponse,
    BaseSearchResultsItem,
    BaseSongWithAlbumResponse,
    EEvent,
    EWebSocketMessage,
    HttpResult,
    isSong,
    TMedia,
    type MediaAddedToPlaylistMessage,
    type MediaRemovedFromPlaylistMessage,
    type PlaylistCreatedMessage,
    type PlaylistDeletedMessage,
    type PlaylistRenamedMessage,
} from "@rockit/shared";
import type { LibraryDragMedia } from "@/models/interfaces/libraryDragDrop";
import { Http } from "@/lib/http";
import {
    addSongPlaylistRef,
    offlineStatusMap,
    removeSongPlaylistRef,
} from "@/lib/offline/store";
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
        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.MediaRemovedFromPlaylist,
            this.handleMediaRemovedFromPlaylist
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

    private handleMediaRemovedFromPlaylist = async (
        data: MediaRemovedFromPlaylistMessage
    ): Promise<void> => {
        rockIt.eventManager.dispatchEvent(EEvent.MediaRemovedFromPlaylist, {
            publicId: data.publicId,
            playlistPublicId: data.playlistPublicId,
        });
    };

    async refreshPlaylistsAsync(): Promise<void> {
        const result = await Http.getUserPlaylistsAsync();
        if (result.isOk()) {
            this._playlistsAtom.set(result.result.playlists);
        }
    }

    async playPlaylist(
        _songs: BaseSongWithAlbumResponse[],
        listPublicId: string,
        startSongPublicId?: string
    ): Promise<void> {
        await rockIt.queueManager.playCollection(
            listPublicId,
            startSongPublicId
        );
    }

    async addMediaToPlaylist(
        media: TMedia,
        playlist: BasePlaylistWithoutMediasResponse
    ): Promise<HttpResult<{ status: string }>> {
        const result = await Http.addMediaToPlaylistAsync(playlist.publicId, {
            mediaPublicId: media.publicId,
        });
        if (
            result.isOk() &&
            isSong(media) &&
            (offlineStatusMap.get()[media.publicId] ?? "idle") === "downloaded"
        ) {
            void addSongPlaylistRef(media.publicId, playlist.publicId).catch(
                () => {}
            );
        }
        return result;
    }

    private libraryDropsPending = new Set<string>();

    async addLibraryMediaToOwnedPlaylist(
        media: LibraryDragMedia,
        playlistPublicId: string
    ): Promise<boolean> {
        if (this.libraryDropsPending.has(playlistPublicId)) return false;
        this.libraryDropsPending.add(playlistPublicId);
        const vocabulary = rockIt.vocabularyManager.vocabulary;
        try {
            // The owned-list endpoint filters by owner_id on the server. Recheck at
            // drop time instead of comparing display names or trusting a stale card.
            const owned = await Http.getUserPlaylistsAsync();
            if (!owned.isOk()) {
                rockIt.notificationManager.notifyError(
                    vocabulary.LIBRARY_DROP_ERROR
                );
                return false;
            }
            this._playlistsAtom.set(owned.result.playlists);
            const target = owned.result.playlists.find(
                (item) => item.publicId === playlistPublicId
            );
            if (!target) {
                rockIt.notificationManager.notifyError(
                    vocabulary.LIBRARY_DROP_OWNER_ONLY
                );
                return false;
            }
            const saved = await this.addMediaToPlaylist(media, target);
            if (!saved.isOk()) {
                rockIt.notificationManager.notifyError(
                    vocabulary.LIBRARY_DROP_ERROR
                );
                return false;
            }
            rockIt.notificationManager.notifySuccess(
                vocabulary.LIBRARY_DROP_SUCCESS.replace(
                    "{media}",
                    media.name
                ).replace("{playlist}", target.name)
            );
            return true;
        } catch {
            rockIt.notificationManager.notifyError(
                vocabulary.LIBRARY_DROP_ERROR
            );
            return false;
        } finally {
            this.libraryDropsPending.delete(playlistPublicId);
        }
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
        // Keep parent-playlist references accurate for songs saved offline
        // without a network call; fire-and-forget IndexedDB write.
        if (
            (offlineStatusMap.get()[mediaPublicId] ?? "idle") === "downloaded"
        ) {
            removeSongPlaylistRef(mediaPublicId, playlistPublicId).catch(
                () => {}
            );
        }

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
        const mediaRes = await Http.addFromUrlAsync({
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

    async addUrlToPlaylistAndDownloadAsync(
        searchItem: BaseSearchResultsItem,
        playlistPublicId: string
    ): Promise<void> {
        const result = await Http.startDownloadFromUrl({
            url: searchItem.providerUrl,
            addToPlaylist: true,
            addToLibrary: false,
            playlistPublicId: playlistPublicId,
        });

        if (!result.isOk()) {
            rockIt.notificationManager.notifyError("Failed to add media.");
            console.error(
                "Error adding media to playlist",
                result.message,
                result.detail
            );
            return;
        }

        rockIt.notificationManager.notifySuccess(
            `"${result.result.data.name}" ${rockIt.vocabularyManager.vocabulary.ADDED_TO_PLAYLIST}`
        );
    }
}
