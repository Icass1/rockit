export interface Friend {
    publicId: string;
    username: string;
    imageUrl: string | null;
    status: string;
    isOnline: boolean;
    nowPlaying: string | null;
    level: number;
    levelTitle: string | null;
    dateAdded: string;
}

export interface FriendRequest {
    publicId: string;
    fromUserPublicId: string;
    fromUsername: string;
    fromUserImageUrl: string | null;
    message: string | null;
    status: string;
    dateAdded: string;
}

export interface UserSearchResult {
    publicId: string;
    username: string;
    imageUrl: string | null;
    isFriend: boolean;
    requestSent: boolean;
}

export interface LeaderboardEntry {
    userId: string;
    username: string;
    imageUrl: string | null;
    level: number;
    xp: number;
    xpToNext: number;
    title: string;
    streak: number;
}

export interface FriendActivity {
    userPublicId: string;
    username: string;
    userImageUrl: string | null;
    mediaPublicId: string;
    mediaName: string;
    mediaImageUrl: string | null;
    listenedAt: string;
}
