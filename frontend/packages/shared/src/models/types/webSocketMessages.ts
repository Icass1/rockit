import type {
    DownloadProgressMessage,
    TestWebSocketMessage,
} from "@rockit/shared";

export enum EWebSocketMessage {
    DownloadProgress = "download_progress",
    TestWebSocketMessage = "test_web_socket_message",
}

export interface IWebSocketMessagePayloadMap {
    [EWebSocketMessage.DownloadProgress]: DownloadProgressMessage;
    [EWebSocketMessage.TestWebSocketMessage]: TestWebSocketMessage;
}

export type TWebSocketIncomingMessage =
    | DownloadProgressMessage
    | TestWebSocketMessage;

export type WebSocketMessageHandler<T extends EWebSocketMessage> = (
    data: IWebSocketMessagePayloadMap[T]
) => void;
