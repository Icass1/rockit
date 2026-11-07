import type { SharedMediaItem } from "@rockit/shared";
import type {
    Friend,
    FriendActivity,
    FriendRequest,
    LeaderboardEntry,
    ListenSession,
    UserSearchResult,
} from "@/models/interfaces";

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
