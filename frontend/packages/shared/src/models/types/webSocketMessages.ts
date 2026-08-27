import type {
    CurrentMediaMessage,
    CurrentQueueMessage,
    CurrentTimeMessage,
    DownloadProgressMessage,
    LibraryMediaAddedMessage,
    LibraryMediaRemovedMessage,
    MediaAddedToPlaylistMessage,
    MediaListenedMessage,
    MediaRemovedFromPlaylistMessage,
    PlaylistCreatedMessage,
    PlaylistDeletedMessage,
    PlaylistRenamedMessage,
    QueueTypeMessage,
} from "@rockit/shared";

export enum EWebSocketMessage {
    DownloadProgress = "download_progress",
    LibraryMediaAdded = "library_media_added",
    LibraryMediaRemoved = "library_media_removed",
    MediaAddedToPlaylist = "media_added_to_playlist",
    MediaRemovedFromPlaylist = "media_removed_from_playlist",
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
    [EWebSocketMessage.LibraryMediaAdded]: LibraryMediaAddedMessage;
    [EWebSocketMessage.LibraryMediaRemoved]: LibraryMediaRemovedMessage;
    [EWebSocketMessage.MediaAddedToPlaylist]: MediaAddedToPlaylistMessage;
    [EWebSocketMessage.MediaRemovedFromPlaylist]: MediaRemovedFromPlaylistMessage;
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
    | LibraryMediaAddedMessage
    | LibraryMediaRemovedMessage
    | MediaAddedToPlaylistMessage
    | MediaRemovedFromPlaylistMessage
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
