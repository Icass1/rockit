import { BACKEND_URL } from "@/environment";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom, createArrayAtom, ReadonlyAtom } from "@/lib/store";

interface Friend {
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

interface FriendRequest {
    publicId: string;
    fromUserPublicId: string;
    fromUsername: string;
    fromUserImageUrl: string | null;
    message: string | null;
    status: string;
    dateAdded: string;
}

interface UserSearchResult {
    publicId: string;
    username: string;
    imageUrl: string | null;
    isFriend: boolean;
    requestSent: boolean;
}

interface LeaderboardEntry {
    userId: string;
    username: string;
    imageUrl: string | null;
    level: number;
    xp: number;
    xpToNext: number;
    title: string;
    streak: number;
}

interface FriendActivity {
    userPublicId: string;
    username: string;
    userImageUrl: string | null;
    mediaPublicId: string;
    mediaName: string;
    mediaImageUrl: string | null;
    listenedAt: string;
}

export class FriendManager {
    private _init = false;

    private _friendsAtom = createArrayAtom<Friend>([]);
    private _incomingRequestsAtom = createArrayAtom<FriendRequest>([]);
    private _sentRequestsAtom = createArrayAtom<FriendRequest>([]);
    private _activityAtom = createArrayAtom<FriendActivity>([]);
    private _searchResultsAtom = createArrayAtom<UserSearchResult>([]);
    private _loadingAtom = createAtom<boolean>(false);
    private _errorAtom = createAtom<string | null>(null);

    async init(): Promise<void> {
        if (typeof window === "undefined") return;
        if (this._init) return;
        this._init = true;
    }

    async fetchFriends(): Promise<void> {
        this._loadingAtom.set(true);
        try {
            const res = await fetch(`${BACKEND_URL}/friends`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            this._friendsAtom.set(data.friends ?? []);
            this._errorAtom.set(null);
        } catch (e) {
            this._errorAtom.set((e as Error).message);
        } finally {
            this._loadingAtom.set(false);
        }
    }

    async fetchRequests(): Promise<void> {
        try {
            const res = await fetch(`${BACKEND_URL}/friends/requests`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            this._incomingRequestsAtom.set(data.incoming ?? []);
            this._sentRequestsAtom.set(data.sent ?? []);
        } catch (e) {
            this._errorAtom.set((e as Error).message);
        }
    }

    async searchUsers(query: string): Promise<void> {
        if (query.length < 2) {
            this._searchResultsAtom.set([]);
            return;
        }
        try {
            const res = await fetch(
                `${BACKEND_URL}/friends/search?q=${encodeURIComponent(query)}`,
                { credentials: "include" }
            );
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            this._searchResultsAtom.set(data.results ?? []);
        } catch (e) {
            this._errorAtom.set((e as Error).message);
        }
    }

    async sendRequest(userPublicId: string): Promise<boolean> {
        try {
            const res = await fetch(
                `${BACKEND_URL}/friends/request/${userPublicId}`,
                { method: "POST", credentials: "include" }
            );
            if (!res.ok) throw new Error(await res.text());
            await this.fetchRequests();
            rockIt.notificationManager.notifySuccess("Friend request sent!");
            return true;
        } catch (e) {
            rockIt.notificationManager.notifyError((e as Error).message);
            return false;
        }
    }

    async acceptRequest(requestPublicId: string): Promise<boolean> {
        try {
            const res = await fetch(
                `${BACKEND_URL}/friends/request/${requestPublicId}/accept`,
                { method: "POST", credentials: "include" }
            );
            if (!res.ok) throw new Error(await res.text());
            await this.fetchRequests();
            await this.fetchFriends();
            rockIt.notificationManager.notifySuccess("Friend request accepted!");
            return true;
        } catch (e) {
            rockIt.notificationManager.notifyError((e as Error).message);
            return false;
        }
    }

    async rejectRequest(requestPublicId: string): Promise<boolean> {
        try {
            const res = await fetch(
                `${BACKEND_URL}/friends/request/${requestPublicId}/reject`,
                { method: "POST", credentials: "include" }
            );
            if (!res.ok) throw new Error(await res.text());
            await this.fetchRequests();
            return true;
        } catch {
            return false;
        }
    }

    async removeFriend(userPublicId: string): Promise<boolean> {
        try {
            const res = await fetch(
                `${BACKEND_URL}/friends/${userPublicId}`,
                { method: "DELETE", credentials: "include" }
            );
            if (!res.ok) throw new Error(await res.text());
            await this.fetchFriends();
            rockIt.notificationManager.notifySuccess("Friend removed");
            return true;
        } catch {
            return false;
        }
    }

    async fetchActivity(): Promise<void> {
        try {
            const res = await fetch(
                `${BACKEND_URL}/friends/activity`,
                { credentials: "include" }
            );
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            this._activityAtom.set(data.activities ?? []);
        } catch {
            // silent
        }
    }

    async fetchLeaderboard(): Promise<{ entries: LeaderboardEntry[]; currentUser: LeaderboardEntry | null }> {
        try {
            const res = await fetch(`${BACKEND_URL}/friends/leaderboard`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error(await res.text());
            return await res.json();
        } catch {
            return { entries: [], currentUser: null };
        }
    }

    get friendsAtom(): ReadonlyAtom<Friend[]> {
        return this._friendsAtom.getReadonlyAtom();
    }

    get incomingRequestsAtom(): ReadonlyAtom<FriendRequest[]> {
        return this._incomingRequestsAtom.getReadonlyAtom();
    }

    get sentRequestsAtom(): ReadonlyAtom<FriendRequest[]> {
        return this._sentRequestsAtom.getReadonlyAtom();
    }

    get activityAtom(): ReadonlyAtom<FriendActivity[]> {
        return this._activityAtom.getReadonlyAtom();
    }

    get searchResultsAtom(): ReadonlyAtom<UserSearchResult[]> {
        return this._searchResultsAtom.getReadonlyAtom();
    }

    get loadingAtom(): ReadonlyAtom<boolean> {
        return this._loadingAtom.getReadonlyAtom();
    }

    get errorAtom(): ReadonlyAtom<string | null> {
        return this._errorAtom.getReadonlyAtom();
    }
}
