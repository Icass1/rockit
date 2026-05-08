import type {
    DownloadProgressMessage,
    LibraryMediaAddedMessage,
    LibraryMediaRemovedMessage,
    TestWebSocketMessage,
} from "@rockit/shared";

export enum EWebSocketMessage {
    DownloadProgress = "download_progress",
    TestWebSocketMessage = "test_web_socket_message",
    LibraryMediaAdded = "library_media_added",
    LibraryMediaRemoved = "library_media_removed",
}

export interface IWebSocketMessagePayloadMap {
    [EWebSocketMessage.DownloadProgress]: DownloadProgressMessage;
    [EWebSocketMessage.TestWebSocketMessage]: TestWebSocketMessage;
    [EWebSocketMessage.LibraryMediaAdded]: LibraryMediaAddedMessage;
    [EWebSocketMessage.LibraryMediaRemoved]: LibraryMediaRemovedMessage;
}

export type TWebSocketIncomingMessage =
    | DownloadProgressMessage
    | TestWebSocketMessage
    | LibraryMediaAddedMessage
    | LibraryMediaRemovedMessage;

export type WebSocketMessageHandler<T extends EWebSocketMessage> = (
    data: IWebSocketMessagePayloadMap[T]
) => void;
