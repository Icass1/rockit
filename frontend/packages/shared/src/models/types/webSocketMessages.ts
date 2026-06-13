import type {
    CurrentMediaMessage,
    CurrentQueueMessage,
    DownloadProgressMessage,
    LibraryMediaAddedMessage,
    LibraryMediaRemovedMessage,
    MediaAddedToPlaylistMessage,
    MediaListenedMessage,
    PlaylistCreatedMessage,
    PlaylistDeletedMessage,
    PlaylistRenamedMessage,
    QueueTypeMessage,
    TestWebSocketMessage,
} from "@rockit/shared";

export enum EWebSocketMessage {
    DownloadProgress = "download_progress",
    TestWebSocketMessage = "test_web_socket_message",
    LibraryMediaAdded = "library_media_added",
    LibraryMediaRemoved = "library_media_removed",
    MediaAddedToPlaylist = "media_added_to_playlist",
    MediaListened = "media_listened",
    PlaylistCreated = "playlist_created",
    PlaylistRenamed = "playlist_renamed",
    PlaylistDeleted = "playlist_deleted",
    CurrentMedia = "current_media",
    CurrentQueue = "current_queue",
    QueueType = "queue_type",
}

export interface IWebSocketMessagePayloadMap {
    [EWebSocketMessage.DownloadProgress]: DownloadProgressMessage;
    [EWebSocketMessage.TestWebSocketMessage]: TestWebSocketMessage;
    [EWebSocketMessage.LibraryMediaAdded]: LibraryMediaAddedMessage;
    [EWebSocketMessage.LibraryMediaRemoved]: LibraryMediaRemovedMessage;
    [EWebSocketMessage.MediaAddedToPlaylist]: MediaAddedToPlaylistMessage;
    [EWebSocketMessage.MediaListened]: MediaListenedMessage;
    [EWebSocketMessage.PlaylistCreated]: PlaylistCreatedMessage;
    [EWebSocketMessage.PlaylistRenamed]: PlaylistRenamedMessage;
    [EWebSocketMessage.PlaylistDeleted]: PlaylistDeletedMessage;
    [EWebSocketMessage.CurrentMedia]: CurrentMediaMessage;
    [EWebSocketMessage.CurrentQueue]: CurrentQueueMessage;
    [EWebSocketMessage.QueueType]: QueueTypeMessage;
}

export type TWebSocketIncomingMessage =
    | DownloadProgressMessage
    | TestWebSocketMessage
    | LibraryMediaAddedMessage
    | LibraryMediaRemovedMessage
    | MediaAddedToPlaylistMessage
    | MediaListenedMessage
    | PlaylistCreatedMessage
    | PlaylistRenamedMessage
    | PlaylistDeletedMessage
    | CurrentMediaMessage
    | CurrentQueueMessage
    | QueueTypeMessage;

export type WebSocketMessageHandler<T extends EWebSocketMessage> = (
    data: IWebSocketMessagePayloadMap[T]
) => void;
