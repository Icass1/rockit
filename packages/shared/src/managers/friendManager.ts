import type { UserLevelResponse } from "@/dto";
import type {
    Friend,
    FriendActivity,
    FriendRequest,
    LeaderboardEntry,
    UserSearchResult,
} from "@/models/interfaces";
import type { FriendServices } from "@/models/interfaces/socialServices";
import {
    EWebSocketMessage,
    type WebSocketMessageHandler,
} from "@/models/types/webSocketMessages";
import { createArrayAtom, createAtom, type ReadonlyAtom } from "@/lib/store";

export class FriendManager {
    private _active = false;
    private _unsubscribeSession?: () => void;
    private _username?: string;
    private _generation = 0;
    private _scopeAtom = createAtom(0);
    private _searchGeneration = 0;
    private _friendsGeneration = 0;
    private _blockedGeneration = 0;
    private _requestsGeneration = 0;
    private _activityGeneration = 0;

    constructor(private readonly getServices: () => FriendServices) {}

    private get services(): FriendServices {
        return this.getServices();
    }

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

    start(): void {
        if (this._active) return;
        this._active = true;
        this.services.webSocketManager.onMessage(
            EWebSocketMessage.SocialChanged,
            this._handleSocial
        );
        this.services.webSocketManager.onMessage(
            EWebSocketMessage.FriendsPresenceChanged,
            this._handlePresence
        );
        this.services.webSocketManager.onMessage(
            EWebSocketMessage.FriendActivity,
            this._handleActivity
        );
        this._unsubscribeSession =
            this.services.userManager.sessionAtom.subscribe((session) => {
                if (session?.username === this._username) return;
                this.reset(session?.username);
                if (this._username) void this.fetchBlocked();
            });
    }

    stop(): void {
        if (!this._active) return;
        this._active = false;
        this._unsubscribeSession?.();
        this._unsubscribeSession = undefined;
        this.services.webSocketManager.offMessage(
            EWebSocketMessage.SocialChanged,
            this._handleSocial
        );
        this.services.webSocketManager.offMessage(
            EWebSocketMessage.FriendsPresenceChanged,
            this._handlePresence
        );
        this.services.webSocketManager.offMessage(
            EWebSocketMessage.FriendActivity,
            this._handleActivity
        );
        this.reset();
    }

    private reset(username?: string): void {
        this._username = username;
        this._generation++;
        this._loadingAtom.set(false);
        this._errorAtom.set(null);
        this._friendsAtom.set([]);
        this._blockedAtom.set([]);
        this._incomingRequestsAtom.set([]);
        this._sentRequestsAtom.set([]);
        this._activityAtom.set([]);
        this._searchResultsAtom.set([]);
        this._scopeAtom.set(this._generation);
    }

    private isCurrent(generation: number): boolean {
        return (
            this._active && !!this._username && generation === this._generation
        );
    }

    private _handleSocial: WebSocketMessageHandler<EWebSocketMessage.SocialChanged> =
        (message) => {
            if (!this.isCurrent(this._generation)) return;
            // The socket snapshot supersedes reads already in flight.
            this._friendsGeneration++;
            this._requestsGeneration++;
            this._activityGeneration++;
            this._friendsAtom.set(message.friends);
            this._incomingRequestsAtom.set(message.incoming);
            this._sentRequestsAtom.set(message.sent);
            this._activityAtom.set(message.activities);
            this._loadingAtom.set(false);
            this._errorAtom.set(null);
        };

    private _handlePresence: WebSocketMessageHandler<EWebSocketMessage.FriendsPresenceChanged> =
        (message) => {
            if (!this.isCurrent(this._generation) || !message.userPublicId)
                return;
            this.updatePresence(
                message.userPublicId,
                message.isOnline ?? false,
                message.nowPlaying ?? null
            );
        };

    private _handleActivity: WebSocketMessageHandler<EWebSocketMessage.FriendActivity> =
        (message) => {
            if (!this.isCurrent(this._generation)) return;
            this._activityGeneration++;
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
            this._activityAtom.set([message, ...existing].slice(0, 30));
        };

    async fetchBlocked(): Promise<void> {
        const generation = this._generation;
        if (!this.isCurrent(generation)) return;
        const revision = ++this._blockedGeneration;
        try {
            const result = await this.services.http.getBlockedUsers();
            if (
                !this.isCurrent(generation) ||
                revision !== this._blockedGeneration
            )
                return;
            if (!result.isOk()) throw new Error(String(result.detail));
            this._blockedAtom.set(result.result.friends);
        } catch {
            if (
                this.isCurrent(generation) &&
                revision === this._blockedGeneration
            )
                this._errorAtom.set(
                    this.services.vocabularyManager.vocabulary
                        .FRIENDS_LOAD_ERROR
                );
        }
    }

    async blockUser(publicId: string): Promise<void> {
        const generation = this._generation;
        if (!this.isCurrent(generation)) return;
        try {
            const result = await this.services.http.blockUser(publicId);
            if (!this.isCurrent(generation)) return;
            if (!result.isOk()) throw new Error(String(result.detail));
            await Promise.all([
                this.fetchFriends(),
                this.fetchBlocked(),
                this.fetchRequests(),
            ]);
        } catch {
            if (this.isCurrent(generation)) this.actionError();
        }
    }

    async unblockUser(publicId: string): Promise<void> {
        const generation = this._generation;
        if (!this.isCurrent(generation)) return;
        try {
            const result = await this.services.http.unblockUser(publicId);
            if (!this.isCurrent(generation)) return;
            if (!result.isOk()) throw new Error(String(result.detail));
            await this.fetchBlocked();
        } catch {
            if (this.isCurrent(generation)) this.actionError();
        }
    }

    async fetchFriends(): Promise<void> {
        const generation = this._generation;
        if (!this.isCurrent(generation)) return;
        const revision = ++this._friendsGeneration;
        this._loadingAtom.set(true);
        try {
            const result = await this.services.http.getFriends();
            if (
                !this.isCurrent(generation) ||
                revision !== this._friendsGeneration
            )
                return;
            if (!result.isOk()) throw new Error(String(result.detail));
            this._friendsAtom.set(result.result.friends);
            this._errorAtom.set(null);
        } catch {
            if (
                this.isCurrent(generation) &&
                revision === this._friendsGeneration
            )
                this._errorAtom.set(
                    this.services.vocabularyManager.vocabulary
                        .FRIENDS_LOAD_ERROR
                );
        } finally {
            if (
                this.isCurrent(generation) &&
                revision === this._friendsGeneration
            )
                this._loadingAtom.set(false);
        }
    }

    async fetchRequests(): Promise<void> {
        const generation = this._generation;
        if (!this.isCurrent(generation)) return;
        const revision = ++this._requestsGeneration;
        try {
            const result = await this.services.http.getFriendRequests();
            if (
                !this.isCurrent(generation) ||
                revision !== this._requestsGeneration
            )
                return;
            if (!result.isOk()) throw new Error(String(result.detail));
            this._incomingRequestsAtom.set(result.result.incoming);
            this._sentRequestsAtom.set(result.result.sent);
        } catch {
            if (
                this.isCurrent(generation) &&
                revision === this._requestsGeneration
            )
                this._errorAtom.set(
                    this.services.vocabularyManager.vocabulary
                        .FRIENDS_LOAD_ERROR
                );
        }
    }

    async searchUsers(query: string): Promise<void> {
        const generation = this._generation;
        if (!this.isCurrent(generation)) return;
        const revision = ++this._searchGeneration;
        if (query.length < 2) {
            this._searchResultsAtom.set([]);
            return;
        }
        try {
            const result = await this.services.http.searchUsers(query);
            if (
                !this.isCurrent(generation) ||
                revision !== this._searchGeneration
            )
                return;
            if (!result.isOk()) throw new Error(String(result.detail));
            this._searchResultsAtom.set(result.result.results);
        } catch {
            if (
                this.isCurrent(generation) &&
                revision === this._searchGeneration
            )
                this._errorAtom.set(
                    this.services.vocabularyManager.vocabulary
                        .FRIENDS_LOAD_ERROR
                );
        }
    }

    private actionError(): void {
        this.services.notificationManager.notifyError(
            this.services.vocabularyManager.vocabulary.FRIENDS_ACTION_ERROR
        );
    }

    async sendRequest(userPublicId: string): Promise<boolean> {
        const generation = this._generation;
        if (!this.isCurrent(generation)) return false;
        try {
            const res =
                await this.services.http.sendFriendRequest(userPublicId);
            if (!this.isCurrent(generation)) return false;
            if (!res.isOk()) throw new Error(String(res.detail));
            this._searchGeneration++;
            this._searchResultsAtom.set(
                this._searchResultsAtom
                    .get()
                    .map((user) =>
                        user.publicId === userPublicId
                            ? { ...user, requestSent: true }
                            : user
                    )
            );
            this.services.notificationManager.notifySuccess(
                this.services.vocabularyManager.vocabulary.FRIENDS_REQUEST_SENT
            );
            return true;
        } catch {
            if (!this.isCurrent(generation)) return false;
            this.services.notificationManager.notifyError(
                this.services.vocabularyManager.vocabulary.FRIENDS_ACTION_ERROR
            );
            return false;
        }
    }

    async acceptRequest(requestPublicId: string): Promise<boolean> {
        const generation = this._generation;
        if (!this.isCurrent(generation)) return false;
        try {
            const res =
                await this.services.http.acceptFriendRequest(requestPublicId);
            if (!this.isCurrent(generation)) return false;
            if (!res.isOk()) throw new Error(String(res.detail));
            this._requestsGeneration++;
            this._incomingRequestsAtom.set(
                this._incomingRequestsAtom
                    .get()
                    .filter((request) => request.publicId !== requestPublicId)
            );
            void this.fetchFriends();
            this.services.notificationManager.notifySuccess(
                this.services.vocabularyManager.vocabulary
                    .FRIENDS_REQUEST_ACCEPTED
            );
            return true;
        } catch {
            if (!this.isCurrent(generation)) return false;
            this.services.notificationManager.notifyError(
                this.services.vocabularyManager.vocabulary.FRIENDS_ACTION_ERROR
            );
            return false;
        }
    }

    async rejectRequest(requestPublicId: string): Promise<boolean> {
        const generation = this._generation;
        if (!this.isCurrent(generation)) return false;
        try {
            const res =
                await this.services.http.rejectFriendRequest(requestPublicId);
            if (!this.isCurrent(generation)) return false;
            if (!res.isOk()) throw new Error(String(res.detail));
            this._requestsGeneration++;
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
        const generation = this._generation;
        if (!this.isCurrent(generation)) return false;
        try {
            const res = await this.services.http.removeFriend(userPublicId);
            if (!this.isCurrent(generation)) return false;
            if (!res.isOk()) throw new Error(String(res.detail));
            this._friendsGeneration++;
            this._loadingAtom.set(false);
            this._friendsAtom.set(
                this._friendsAtom
                    .get()
                    .filter((friend) => friend.publicId !== userPublicId)
            );
            this.services.notificationManager.notifySuccess(
                this.services.vocabularyManager.vocabulary.FRIENDS_REMOVED
            );
            return true;
        } catch {
            return false;
        }
    }

    async fetchActivity(): Promise<void> {
        const generation = this._generation;
        if (!this.isCurrent(generation)) return;
        const revision = ++this._activityGeneration;
        try {
            const result = await this.services.http.getFriendsActivity();
            if (
                !this.isCurrent(generation) ||
                revision !== this._activityGeneration
            )
                return;
            if (!result.isOk()) throw new Error(String(result.detail));
            this._activityAtom.set(result.result.activities);
        } catch {
            if (
                this.isCurrent(generation) &&
                revision === this._activityGeneration
            )
                this._errorAtom.set(
                    this.services.vocabularyManager.vocabulary
                        .FRIENDS_LOAD_ERROR
                );
        }
    }

    updatePresence(
        publicId: string,
        isOnline: boolean,
        nowPlaying?: string | null
    ): void {
        if (!this.isCurrent(this._generation)) return;
        this._friendsAtom.set(
            this._friendsAtom.get().map((friend) =>
                friend.publicId === publicId
                    ? {
                          ...friend,
                          isOnline,
                          nowPlaying:
                              nowPlaying === undefined
                                  ? friend.nowPlaying
                                  : nowPlaying,
                      }
                    : friend
            )
        );
    }

    /** Read on demand; results from a previous account must never reach a profile. */
    async fetchListeningProfile(
        userPublicId?: string
    ): Promise<UserLevelResponse | null> {
        const generation = this._generation;
        if (!this.isCurrent(generation)) return null;
        try {
            const result = userPublicId
                ? await this.services.http.getUserLevel(userPublicId)
                : await this.services.http.getMyLevel();
            if (!this.isCurrent(generation)) return null;
            if (!result.isOk()) throw new Error(String(result.detail));
            return result.result;
        } catch (error) {
            if (!this.isCurrent(generation)) return null;
            throw error;
        }
    }

    async fetchLeaderboard(): Promise<{
        entries: LeaderboardEntry[];
        currentUser: LeaderboardEntry | null;
    }> {
        const generation = this._generation;
        const empty = { entries: [], currentUser: null };
        if (!this.isCurrent(generation)) return empty;
        try {
            const res = await this.services.http.getLeaderboard();
            if (!this.isCurrent(generation)) return empty;
            if (!res.isOk()) throw new Error(String(res.detail));
            return {
                entries: res.result.entries ?? [],
                currentUser: res.result.currentUser,
            };
        } catch (error) {
            if (!this.isCurrent(generation)) return empty;
            throw error;
        }
    }

    get scopeAtom(): ReadonlyAtom<number> {
        return this._scopeAtom.getReadonlyAtom();
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
