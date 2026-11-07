import type {
    Friend,
    FriendActivity,
    FriendRequest,
    LeaderboardEntry,
    ListenSession,
    SharedMediaItem,
    UserSearchResult,
} from "@rockit/shared";

export type MobileSocialTab =
    | "friends"
    | "requests"
    | "search"
    | "activity"
    | "sessions"
    | "leaderboard"
    | "blocked"
    | "inbox"
    | "sent";
export type MobileSocialRow =
    | { kind: "friend" | "blocked"; value: Friend }
    | { kind: "request" | "pending"; value: FriendRequest }
    | { kind: "search"; value: UserSearchResult }
    | { kind: "activity"; value: FriendActivity }
    | { kind: "session"; value: ListenSession }
    | { kind: "rank"; value: LeaderboardEntry }
    | { kind: "inbox" | "sent"; value: SharedMediaItem };
