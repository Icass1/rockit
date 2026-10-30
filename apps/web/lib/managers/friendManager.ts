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
    private _friendsGeneration = 0;

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
                void this.fetchBlocked();
            } else {
                ++this._friendsGeneration;
                this._loadingAtom.set(false);
                this._friendsAtom.set([]);
                this._blockedAtom.set([]);
                this._incomingRequestsAtom.set([]);
                this._sentRequestsAtom.set([]);
                this._activityAtom.set([]);
            }
        });

        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.SocialChanged,
            (message) => {
                this._friendsAtom.set(message.friends);
                this._incomingRequestsAtom.set(message.incoming);
                this._sentRequestsAtom.set(message.sent);
                this._activityAtom.set(message.activities);
                this._loadingAtom.set(false);
                this._errorAtom.set(null);
            }
        );
        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.FriendsPresenceChanged,
            (message) => {
                if (!message.userPublicId) return;
                this._friendsAtom.set(
                    this._friendsAtom.get().map((friend) =>
                        friend.publicId === message.userPublicId
                            ? {
                                  ...friend,
                                  isOnline: message.isOnline ?? false,
                                  nowPlaying: message.nowPlaying ?? null,
                              }
                            : friend
                    )
                );
            }
        );
        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.FriendActivity,
            (message) => {
                const existing = this._activityAtom.get();
                if (
                    existing.some(
                        (item) =>
                            item.userPublicId === message.userPublicId &&
                            item.mediaPublicId === message.mediaPublicId &&
                            item.listenedAt === message.listenedAt
                    )
                )
                    return;
                this._activityAtom.set(
                    [
                        {
                            userPublicId: message.userPublicId,
                            username: message.username,
                            userImageUrl: message.userImageUrl,
                            mediaPublicId: message.mediaPublicId,
                            mediaName: message.mediaName,
                            mediaImageUrl: message.mediaImageUrl,
                            listenedAt: message.listenedAt,
                        },
                        ...existing,
                    ].slice(0, 30)
                );
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
        else {
            console.error(result.detail);
            this._errorAtom.set(
                rockIt.vocabularyManager.vocabulary.FRIENDS_LOAD_ERROR
            );
        }
    }

    async blockUser(publicId: string): Promise<void> {
        const result = await Http.blockUser(publicId);
        if (!result.isOk()) {
            console.error(result.detail);
            rockIt.notificationManager.notifyError(
                rockIt.vocabularyManager.vocabulary.FRIENDS_ACTION_ERROR
            );
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
            console.error(result.detail);
            rockIt.notificationManager.notifyError(
                rockIt.vocabularyManager.vocabulary.FRIENDS_ACTION_ERROR
            );
            return;
        }
        await this.fetchBlocked();
    }

    async fetchFriends(): Promise<void> {
        const requestingUser = rockIt.userManager.usernameAtom.get();
        if (!rockIt.userManager.loggedInAtom.get()) return;
        const generation = ++this._friendsGeneration;
        this._loadingAtom.set(true);
        try {
            const res = await Http.getFriends();
            if (
                generation !== this._friendsGeneration ||
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
            if (generation !== this._friendsGeneration) return;
            console.error(e);
            this._errorAtom.set(
                rockIt.vocabularyManager.vocabulary.FRIENDS_LOAD_ERROR
            );
        } finally {
            if (generation === this._friendsGeneration)
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
            console.error(e);
            this._errorAtom.set(
                rockIt.vocabularyManager.vocabulary.FRIENDS_LOAD_ERROR
            );
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
            console.error(e);
            this._errorAtom.set(
                rockIt.vocabularyManager.vocabulary.FRIENDS_LOAD_ERROR
            );
        }
    }

    async sendRequest(userPublicId: string): Promise<boolean> {
        try {
            const res = await Http.sendFriendRequest(userPublicId);
            if (!res.isOk()) throw new Error(String(res.detail));
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
            console.error(e);
            rockIt.notificationManager.notifyError(
                rockIt.vocabularyManager.vocabulary.FRIENDS_ACTION_ERROR
            );
            return false;
        }
    }

    async acceptRequest(requestPublicId: string): Promise<boolean> {
        try {
            const res = await Http.acceptFriendRequest(requestPublicId);
            if (!res.isOk()) throw new Error(String(res.detail));
            this._incomingRequestsAtom.set(
                this._incomingRequestsAtom
                    .get()
                    .filter((request) => request.publicId !== requestPublicId)
            );
            void this.fetchFriends();
            rockIt.notificationManager.notifySuccess(
                rockIt.vocabularyManager.vocabulary.FRIENDS_REQUEST_ACCEPTED
            );
            return true;
        } catch (e) {
            console.error(e);
            rockIt.notificationManager.notifyError(
                rockIt.vocabularyManager.vocabulary.FRIENDS_ACTION_ERROR
            );
            return false;
        }
    }

    async rejectRequest(requestPublicId: string): Promise<boolean> {
        try {
            const res = await Http.rejectFriendRequest(requestPublicId);
            if (!res.isOk()) throw new Error(String(res.detail));
            this._incomingRequestsAtom.set(
                this._incomingRequestsAtom
                    .get()
                    .filter((request) => request.publicId !== requestPublicId)
            );
            return true;
        } catch {
            return false;
        }
    }

    async removeFriend(userPublicId: string): Promise<boolean> {
        try {
            const res = await Http.removeFriend(userPublicId);
            if (!res.isOk()) throw new Error(String(res.detail));
            this._friendsAtom.set(
                this._friendsAtom
                    .get()
                    .filter((friend) => friend.publicId !== userPublicId)
            );
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

    updatePresence(
        publicId: string,
        isOnline: boolean,
        nowPlaying?: string | null
    ): void {
        this._friendsAtom.set(
            this._friendsAtom.get().map((friend) =>
                friend.publicId === publicId
                    ? {
                          ...friend,
                          isOnline,
                          nowPlaying: nowPlaying ?? friend.nowPlaying,
                      }
                    : friend
            )
        );
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
