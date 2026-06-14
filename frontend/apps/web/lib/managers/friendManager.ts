import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom, createArrayAtom, ReadonlyAtom } from "@/lib/store";
import { EWebSocketMessage } from "@rockit/shared";
import type { Friend, FriendRequest, UserSearchResult, LeaderboardEntry, FriendActivity } from "@/models/interfaces";

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

        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.FriendActivity,
            () => {
                this.fetchActivity();
            }
        );
    }

    async fetchFriends(): Promise<void> {
        this._loadingAtom.set(true);
        try {
            const res = await Http.getFriends();
            if (res.isOk()) {
                this._friendsAtom.set(res.result.friends ?? []);
            }
            this._errorAtom.set(null);
        } catch (e) {
            this._errorAtom.set((e as Error).message);
        } finally {
            this._loadingAtom.set(false);
        }
    }

    async fetchRequests(): Promise<void> {
        try {
            const res = await Http.getFriendRequests();
            if (res.isOk()) {
                this._incomingRequestsAtom.set(res.result.incoming ?? []);
                this._sentRequestsAtom.set(res.result.sent ?? []);
            }
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
            const res = await Http.searchUsers(query);
            if (res.isOk()) {
                this._searchResultsAtom.set(res.result.results ?? []);
            }
        } catch (e) {
            this._errorAtom.set((e as Error).message);
        }
    }

    async sendRequest(userPublicId: string): Promise<boolean> {
        try {
            const res = await Http.sendFriendRequest(userPublicId);
            if (!res.isOk()) throw new Error(String(res.detail));
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
            const res = await Http.acceptFriendRequest(requestPublicId);
            if (!res.isOk()) throw new Error(String(res.detail));
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
            const res = await Http.rejectFriendRequest(requestPublicId);
            if (!res.isOk()) throw new Error(String(res.detail));
            await this.fetchRequests();
            return true;
        } catch {
            return false;
        }
    }

    async removeFriend(userPublicId: string): Promise<boolean> {
        try {
            const res = await Http.removeFriend(userPublicId);
            if (!res.isOk()) throw new Error(String(res.detail));
            await this.fetchFriends();
            rockIt.notificationManager.notifySuccess("Friend removed");
            return true;
        } catch {
            return false;
        }
    }

    async fetchActivity(): Promise<void> {
        try {
            const res = await Http.getFriendsActivity();
            if (res.isOk()) {
                this._activityAtom.set(res.result.activities ?? []);
            }
        } catch {
            // silent
        }
    }

    async fetchLeaderboard(): Promise<{ entries: LeaderboardEntry[]; currentUser: LeaderboardEntry | null }> {
        try {
            const res = await Http.getLeaderboard();
            if (res.isOk()) {
                return {
                    entries: res.result.entries ?? [],
                    currentUser: res.result.currentUser,
                };
            }
            return { entries: [], currentUser: null };
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
