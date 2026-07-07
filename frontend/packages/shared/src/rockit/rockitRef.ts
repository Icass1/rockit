import {
    type BookmarkResponse,
    type CurrentMediaMessageRequest,
    type CurrentQueueMessageRequest,
    type CurrentTimeMessageRequest,
    type MediaClickedMessageRequest,
    type MediaEndedMessageRequest,
    type QueueTypeRequest,
    type SeekMessageRequest,
    type SkipClickedMessageRequest,
} from "../dto";
import { type BaseHttp } from "../http/baseHttp";
import { type BaseMediaPlayerManager } from "../managers/baseMediaPlayerManager";
import { type BaseQueueManager } from "../managers/baseQueueManager";
import { type BaseUserManager } from "../managers/baseUserManager";
import { type Vocabulary } from "../models/types/vocabulary";
import {
    type EWebSocketMessage,
    type WebSocketMessageHandler,
} from "../models/types/webSocketMessages";

// ─────────────────────────────────────────────
// Collaborator interfaces
//
// The base managers reach their peers through this container instead of an
// app-specific `rockIt` global. Only the surface the base logic actually uses
// is declared here — each app's concrete manager satisfies it structurally.
// ─────────────────────────────────────────────

export interface IWebSocketManager {
    onMessage<K extends EWebSocketMessage>(
        type: K,
        handler: WebSocketMessageHandler<K>
    ): void;
    offMessage<K extends EWebSocketMessage>(
        type: K,
        handler: WebSocketMessageHandler<K>
    ): void;
    sendSeek(data: SeekMessageRequest): void;
    sendCurrentMedia(data: CurrentMediaMessageRequest): void;
    sendCurrentTime(data: CurrentTimeMessageRequest): void;
    sendMediaEnded(data: MediaEndedMessageRequest): void;
    sendCurrentQueue(data: CurrentQueueMessageRequest): void;
    sendSkipClicked(data: SkipClickedMessageRequest): void;
    sendMediaClicked(data: MediaClickedMessageRequest): void;
    sendQueueType(data: QueueTypeRequest): void;
}

export interface IBookmarkManager {
    // Minimal readable shape — web exposes a ReadonlyArrayAtom, mobile a raw
    // nanostores atom; the base only ever reads the current value.
    readonly currentMediaBookmarksAtom: { get(): BookmarkResponse[] };
    skipToNextBookmark(): boolean;
    skipToPrevBookmark(): boolean;
}

export interface INotificationManager {
    notifyError(message: string): void;
    notifyInfo(message: string): void;
    notifySuccess(message: string): void;
}

export interface IVocabularyManager {
    // Proxy that returns the key itself when missing, so any key is safe to read.
    readonly vocabulary: Vocabulary;
}

export interface IRockItContainer {
    queueManager: BaseQueueManager;
    mediaPlayerManager: BaseMediaPlayerManager;
    userManager: BaseUserManager;
    webSocketManager: IWebSocketManager;
    bookmarkManager: IBookmarkManager;
    notificationManager: INotificationManager;
    vocabularyManager: IVocabularyManager;
    http: typeof BaseHttp;
}

// ─────────────────────────────────────────────
// Registry — each app registers its container once during init.
// ─────────────────────────────────────────────

let _rockIt: IRockItContainer | undefined;

export function setRockIt(container: IRockItContainer): void {
    _rockIt = container;
}

export function getRockIt(): IRockItContainer {
    if (!_rockIt) {
        throw new Error(
            "RockIt container not registered. Call setRockIt() during app init."
        );
    }
    return _rockIt;
}
