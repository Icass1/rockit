import type {
    CurrentMediaMessage,
    CurrentQueueMessage,
    CurrentTimeMessage,
    DownloadProgressMessage,
    LibraryMediaAddedMessage,
    LibraryMediaRemovedMessage,
    MediaAddedToPlaylistMessage,
    MediaListenedMessage,
    PlaylistCreatedMessage,
    PlaylistDeletedMessage,
    PlaylistRenamedMessage,
    QueueTypeMessage,
} from "@rockit/shared";

export interface FriendActivityMessage {
    type: "friend_activity";
    userPublicId: string;
    username: string;
    userImageUrl: string | null;
    mediaPublicId: string;
    mediaName: string;
    mediaImageUrl: string | null;
    listenedAt: string;
}

export interface ListenTogetherSyncMessage {
    type: "listen_together_sync";
    publicId: string;
    hostPublicId: string;
    hostUsername: string;
    hostImageUrl: string | null;
    guestPublicId: string;
    guestUsername: string;
    guestImageUrl: string | null;
    currentMediaPublicId: string | null;
    currentMediaName: string | null;
    currentMediaImageUrl: string | null;
    currentTimeMs: number;
    isPlaying: boolean;
    status: string;
}

export enum EWebSocketMessage {
    DownloadProgress = "download_progress",
    FriendActivity = "friend_activity",
    LibraryMediaAdded = "library_media_added",
    LibraryMediaRemoved = "library_media_removed",
    ListenTogetherSync = "listen_together_sync",
    MediaAddedToPlaylist = "media_added_to_playlist",
    MediaListened = "media_listened",
    PlaylistCreated = "playlist_created",
    PlaylistRenamed = "playlist_renamed",
    PlaylistDeleted = "playlist_deleted",
    CurrentMedia = "current_media",
    CurrentQueue = "current_queue",
    QueueType = "queue_type",
    CurrentTime = "current_time",
}

export interface IWebSocketMessagePayloadMap {
    [EWebSocketMessage.DownloadProgress]: DownloadProgressMessage;
    [EWebSocketMessage.FriendActivity]: FriendActivityMessage;
    [EWebSocketMessage.LibraryMediaAdded]: LibraryMediaAddedMessage;
    [EWebSocketMessage.LibraryMediaRemoved]: LibraryMediaRemovedMessage;
    [EWebSocketMessage.ListenTogetherSync]: ListenTogetherSyncMessage;
    [EWebSocketMessage.MediaAddedToPlaylist]: MediaAddedToPlaylistMessage;
    [EWebSocketMessage.MediaListened]: MediaListenedMessage;
    [EWebSocketMessage.PlaylistCreated]: PlaylistCreatedMessage;
    [EWebSocketMessage.PlaylistRenamed]: PlaylistRenamedMessage;
    [EWebSocketMessage.PlaylistDeleted]: PlaylistDeletedMessage;
    [EWebSocketMessage.CurrentMedia]: CurrentMediaMessage;
    [EWebSocketMessage.CurrentQueue]: CurrentQueueMessage;
    [EWebSocketMessage.QueueType]: QueueTypeMessage;
    [EWebSocketMessage.CurrentTime]: CurrentTimeMessage;
}

export type TWebSocketIncomingMessage =
    | DownloadProgressMessage
    | FriendActivityMessage
    | LibraryMediaAddedMessage
    | LibraryMediaRemovedMessage
    | ListenTogetherSyncMessage
    | MediaAddedToPlaylistMessage
    | MediaListenedMessage
    | PlaylistCreatedMessage
    | PlaylistRenamedMessage
    | PlaylistDeletedMessage
    | CurrentMediaMessage
    | CurrentQueueMessage
    | QueueTypeMessage
    | CurrentTimeMessage;

export type WebSocketMessageHandler<T extends EWebSocketMessage> = (
    data: IWebSocketMessagePayloadMap[T]
) => void;
