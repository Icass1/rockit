import { EWebSocketMessage } from "@rockit/shared";
import type {
    Friend,
    FriendActivity,
    FriendRequest,
    LeaderboardEntry,
    UserSearchResult,
} from "@/models/interfaces";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { createArrayAtom, createAtom, ReadonlyAtom } from "@/lib/store";

export class FriendManager {
    private _init = false;
    private _searchGeneration = 0;

    private _blockedAtom = createArrayAtom<Friend>([]);
    get blockedAtom(): ReadonlyAtom<Friend[]> {
        return this._blockedAtom.getReadonlyAtom();
    }

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
        rockIt.userManager.loggedInAtom.subscribe((loggedIn) => {
            if (loggedIn) {
                void this.fetchFriends();
                void this.fetchBlocked();
                void this.fetchRequests();
            } else {
                this._friendsAtom.set([]);
                this._blockedAtom.set([]);
                this._incomingRequestsAtom.set([]);
                this._sentRequestsAtom.set([]);
                this._activityAtom.set([]);
            }
        });

        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.SocialChanged,
            () => {
                void this.fetchFriends();
                void this.fetchBlocked();
                void this.fetchRequests();
                void this.fetchActivity();
            }
        );
        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.FriendActivity,
            () => {
                this.fetchActivity();
            }
        );
    }

    async fetchBlocked(): Promise<void> {
        const requestingUser = rockIt.userManager.usernameAtom.get();
        if (!rockIt.userManager.loggedInAtom.get()) return;
        const result = await Http.getBlockedUsers();
        if (
            !rockIt.userManager.loggedInAtom.get() ||
            requestingUser !== rockIt.userManager.usernameAtom.get()
        )
            return;
        if (result.isOk()) this._blockedAtom.set(result.result.friends);
        else this._errorAtom.set(String(result.detail));
    }

    async blockUser(publicId: string): Promise<void> {
        const result = await Http.blockUser(publicId);
        if (!result.isOk()) {
            rockIt.notificationManager.notifyError(String(result.detail));
            return;
        }
        await Promise.all([
            this.fetchFriends(),
            this.fetchBlocked(),
            this.fetchRequests(),
        ]);
    }

    async unblockUser(publicId: string): Promise<void> {
        const result = await Http.unblockUser(publicId);
        if (!result.isOk()) {
            rockIt.notificationManager.notifyError(String(result.detail));
            return;
        }
        await this.fetchBlocked();
    }

    async fetchFriends(): Promise<void> {
        const requestingUser = rockIt.userManager.usernameAtom.get();
        if (!rockIt.userManager.loggedInAtom.get()) return;
        this._loadingAtom.set(true);
        try {
            const res = await Http.getFriends();
            if (
                !rockIt.userManager.loggedInAtom.get() ||
                requestingUser !== rockIt.userManager.usernameAtom.get()
            )
                return;
            if (res.isOk()) {
                this._friendsAtom.set(res.result.friends ?? []);
            }
            if (!res.isOk()) throw new Error(String(res.detail));
            this._errorAtom.set(null);
        } catch (e) {
            this._errorAtom.set((e as Error).message);
        } finally {
            this._loadingAtom.set(false);
        }
    }

    async fetchRequests(): Promise<void> {
        const requestingUser = rockIt.userManager.usernameAtom.get();
        if (!rockIt.userManager.loggedInAtom.get()) return;
        try {
            const res = await Http.getFriendRequests();
            if (
                !rockIt.userManager.loggedInAtom.get() ||
                requestingUser !== rockIt.userManager.usernameAtom.get()
            )
                return;
            if (res.isOk()) {
                this._incomingRequestsAtom.set(res.result.incoming ?? []);
                this._sentRequestsAtom.set(res.result.sent ?? []);
            }
        } catch (e) {
            this._errorAtom.set((e as Error).message);
        }
    }

    async searchUsers(query: string): Promise<void> {
        const requestingUser = rockIt.userManager.usernameAtom.get();
        if (!rockIt.userManager.loggedInAtom.get()) return;
        const generation = ++this._searchGeneration;
        if (query.length < 2) {
            this._searchResultsAtom.set([]);
            return;
        }
        try {
            const res = await Http.searchUsers(query);
            if (
                !rockIt.userManager.loggedInAtom.get() ||
                requestingUser !== rockIt.userManager.usernameAtom.get()
            )
                return;
            if (res.isOk() && generation === this._searchGeneration) {
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
            this._searchResultsAtom.set(
                this._searchResultsAtom
                    .get()
                    .map((user) =>
                        user.publicId === userPublicId
                            ? { ...user, requestSent: true }
                            : user
                    )
            );
            rockIt.notificationManager.notifySuccess(
                rockIt.vocabularyManager.vocabulary.FRIENDS_REQUEST_SENT
            );
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
            rockIt.notificationManager.notifySuccess(
                rockIt.vocabularyManager.vocabulary.FRIENDS_REQUEST_ACCEPTED
            );
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
            rockIt.notificationManager.notifySuccess(
                rockIt.vocabularyManager.vocabulary.FRIENDS_REMOVED
            );
            return true;
        } catch {
            return false;
        }
    }

    async fetchActivity(): Promise<void> {
        const requestingUser = rockIt.userManager.usernameAtom.get();
        if (!rockIt.userManager.loggedInAtom.get()) return;
        try {
            const res = await Http.getFriendsActivity();
            if (
                !rockIt.userManager.loggedInAtom.get() ||
                requestingUser !== rockIt.userManager.usernameAtom.get()
            )
                return;
            if (res.isOk()) {
                this._activityAtom.set(res.result.activities ?? []);
            }
        } catch {
            // silent
        }
    }

    async fetchLeaderboard(): Promise<{
        entries: LeaderboardEntry[];
        currentUser: LeaderboardEntry | null;
    }> {
        const res = await Http.getLeaderboard();
        if (!res.isOk()) throw new Error("Could not load leaderboard");
        return {
            entries: res.result.entries ?? [],
            currentUser: res.result.currentUser,
        };
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
