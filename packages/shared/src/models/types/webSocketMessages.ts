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
    OnlineUsersMessage,
    PlaylistCreatedMessage,
    PlaylistDeletedMessage,
    PlaylistRenamedMessage,
    QueueTypeMessage,
} from "@rockit/shared";

export interface FriendsPresenceChangedMessage {
    type: "friends_presence_changed";
    userPublicId?: string | null;
    isOnline?: boolean;
    nowPlaying?: string | null;
}

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
}
export interface SocialChangedMessage {
    type: "social_changed";
    friends: import("../interfaces/friend").Friend[];
    incoming: import("../interfaces/friend").FriendRequest[];
    sent: import("../interfaces/friend").FriendRequest[];
    activities: import("../interfaces/friend").FriendActivity[];
}

export interface NotificationsChangedMessage {
    type: "notifications_changed";
    unreadCount: number;
    totalCount: number;
}

export interface NotificationStateMessage {
    type: "notification_state";
    unreadCount: number;
    totalCount: number;
}

export enum EWebSocketMessage {
    DownloadProgress = "download_progress",
    FriendActivity = "friend_activity",
    SocialChanged = "social_changed",
    OnlineUsers = "online_users",
    FriendsPresenceChanged = "friends_presence_changed",
    NotificationsChanged = "notifications_changed",
    NotificationState = "notification_state",
    LibraryMediaAdded = "library_media_added",
    LibraryMediaRemoved = "library_media_removed",
    ListenTogetherSync = "listen_together_sync",
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
    [EWebSocketMessage.OnlineUsers]: OnlineUsersMessage;
    [EWebSocketMessage.FriendsPresenceChanged]: FriendsPresenceChangedMessage;
    [EWebSocketMessage.SocialChanged]: SocialChangedMessage;
    [EWebSocketMessage.NotificationsChanged]: NotificationsChangedMessage;
    [EWebSocketMessage.NotificationState]: NotificationStateMessage;
    [EWebSocketMessage.DownloadProgress]: DownloadProgressMessage;
    [EWebSocketMessage.FriendActivity]: FriendActivityMessage;
    [EWebSocketMessage.LibraryMediaAdded]: LibraryMediaAddedMessage;
    [EWebSocketMessage.LibraryMediaRemoved]: LibraryMediaRemovedMessage;
    [EWebSocketMessage.ListenTogetherSync]: ListenTogetherSyncMessage;
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
    | OnlineUsersMessage
    | FriendsPresenceChangedMessage
    | DownloadProgressMessage
    | FriendActivityMessage
    | SocialChangedMessage
    | NotificationsChangedMessage
    | NotificationStateMessage
    | LibraryMediaAddedMessage
    | LibraryMediaRemovedMessage
    | ListenTogetherSyncMessage
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
