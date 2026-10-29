// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import * as dto from "@/dto";
import { BACKEND_URL } from "@/environment";
import { IApiFetchOptions, TZodSchema } from "@/models/types/api";
import { FastApiError, HttpResult } from "@/models/types/httpTypes";

type Middleware = <T>(
    next: () => Promise<HttpResult<T>>,
    context: { path: string; schema: TZodSchema<T>; options: IApiFetchOptions }
) => Promise<HttpResult<T>>;

export class BaseHttp {
    static middlewares: Middleware[] = [];

    protected static baseApiFetchAsync(
        _path: string,
        _options: IApiFetchOptions = {}
    ): Promise<Response> {
        console.error(
            "Not implememented error. Use the this class that extends this on in each application."
        );
        throw "Not implemented error";
    }

    private static async apiFetchAsync<T>(
        path: string,
        schema: TZodSchema<T>,
        options: IApiFetchOptions = {}
    ): Promise<HttpResult<T>> {
        const next: (n: number) => Promise<HttpResult<T>> = async (
            n: number
        ) => {
            if (!this.middlewares[n])
                return await this._apiFetchAsync(path, schema, options);

            return await this.middlewares[n](() => next(n + 1), {
                path,
                schema,
                options,
            });
        };

        return next(0);
    }

    private static async _apiFetchAsync<T>(
        path: string,
        schema: TZodSchema<T>,
        options: IApiFetchOptions = {}
    ): Promise<HttpResult<T>> {
        let res: Response;

        try {
            res = await this.baseApiFetchAsync(path, options);
        } catch (err) {
            return new HttpResult<T>({
                ok: false,
                code: 0,
                message: "Network Error",
                detail: (err as Error).message,
            });
        }

        let json: unknown;

        try {
            json = await res.json();
        } catch {
            return new HttpResult<T>({
                ok: false,
                code: res.status,
                message: res.statusText,
                detail: "Invalid JSON response from server",
            });
        }

        if (!res.ok) {
            const obj = json as { detail?: FastApiError["detail"] };
            console.error(obj.detail ?? "Unknown error");

            return new HttpResult<T>({
                ok: false,
                code: res.status,
                message: res.statusText,
                detail: obj.detail ?? "Unknown error",
            });
        }

        try {
            const parsed = schema.parse(json);
            return new HttpResult<T>({
                ok: true,
                code: res.status,
                message: res.statusText,
                result: parsed,
            });
        } catch (err) {
            console.error("Validation error", err);
            return new HttpResult<T>({
                ok: false,
                code: res.status,
                message: "Validation Error",
                detail: (err as Error).message,
            });
        }
    }

    private static async apiPostAsync<T, G>(
        path: string,
        _requestSchema: TZodSchema<T>,
        responseSchema: TZodSchema<G>,
        body: T
    ): Promise<HttpResult<G>> {
        return this.apiFetchAsync(path, responseSchema, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    }

    private static async apiGetAsync<T>(
        path: string,
        responseSchema: TZodSchema<T>
    ): Promise<HttpResult<T>> {
        return this.apiFetchAsync(path, responseSchema, {
            method: "GET",
        });
    }

    private static async apiDeleteAsync<T>(
        path: string,
        responseSchema: TZodSchema<T>
    ): Promise<HttpResult<T>> {
        return this.apiFetchAsync(path, responseSchema, {
            method: "DELETE",
        });
    }

    private static async apiPatchAsync<T>(
        path: string,
        responseSchema: TZodSchema<T>,
        payload?: unknown
    ): Promise<HttpResult<T>> {
        return this.apiFetchAsync(path, responseSchema, {
            method: "PATCH",
            headers:
                payload === undefined
                    ? undefined
                    : { "Content-Type": "application/json" },
            body: payload === undefined ? undefined : JSON.stringify(payload),
        });
    }

    static async downloadBinary(
        url: string,
        payload: unknown
    ): Promise<HttpResult<Blob>> {
        // This bypasses apiFetchAsync because the response is binary, so the
        // network error handling it normally provides has to be repeated here.
        let response: Response;
        try {
            response = await this.baseApiFetchAsync(
                url.replace(BACKEND_URL, ""),
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );
        } catch (err) {
            return new HttpResult({
                ok: false,
                code: 0,
                message: "Network Error",
                detail: (err as Error).message,
            });
        }

        if (!response.ok) {
            let detail: string | unknown[] | Record<string, unknown> =
                response.statusText;
            try {
                detail = (await response.json()).detail ?? detail;
            } catch {
                // Keep the HTTP status when the backend did not return JSON.
            }
            return new HttpResult({
                ok: false,
                code: response.status,
                message: response.statusText,
                detail,
            });
        }

        return new HttpResult({
            ok: true,
            code: response.status,
            message: "OK",
            result: await response.blob(),
        });
    }

    static async addBuild(payload: dto.AddVersionRequest) {
        return this.apiPostAsync(
            `/admin/builds`,
            dto.AddVersionRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async getAllBuilds() {
        return this.apiGetAsync(`/admin/builds`, dto.AllBuildsResponseSchema);
    }

    static async uploadApk(payload: dto.UploadApkRequest) {
        return this.apiPostAsync(
            `/admin/builds/upload`,
            dto.UploadApkRequestSchema,
            dto.UploadApkResponseSchema,
            payload
        );
    }

    static async uploadChunk(payload: dto.UploadChunkRequest) {
        return this.apiPostAsync(
            `/admin/builds/upload/chunk`,
            dto.UploadChunkRequestSchema,
            dto.UploadChunkResponseSchema,
            payload
        );
    }

    static async completeChunkedUpload(
        payload: dto.CompleteChunkedUploadRequest
    ) {
        return this.apiPostAsync(
            `/admin/builds/upload/complete`,
            dto.CompleteChunkedUploadRequestSchema,
            dto.UploadApkResponseSchema,
            payload
        );
    }

    static async startChunkedUpload(payload: dto.StartChunkedUploadRequest) {
        return this.apiPostAsync(
            `/admin/builds/upload/start`,
            dto.StartChunkedUploadRequestSchema,
            dto.StartChunkedUploadResponseSchema,
            payload
        );
    }

    static async searchMedia(q: string, limit?: number) {
        const queryParams = new URLSearchParams();
        queryParams.append("q", `${q}`);
        if (limit !== undefined) queryParams.append("limit", `${limit}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/admin/media/search${queryString ? `?${queryString}` : ""}`,
            dto.AdminSearchResponseSchema
        );
    }

    static async getRequestLogStats() {
        return this.apiGetAsync(
            `/admin/request-logs/stats`,
            dto.RequestLogStatsResponseSchema
        );
    }

    static async getAllRequests(payload: dto.GetAllRequestsRequest) {
        return this.apiPostAsync(
            `/admin/requests`,
            dto.GetAllRequestsRequestSchema,
            dto.UserRequestListResponseSchema,
            payload
        );
    }

    static async getRequestStats() {
        return this.apiGetAsync(
            `/admin/requests/stats`,
            dto.AdminRequestStatsResponseSchema
        );
    }

    static async reviewRequest(
        publicId: string,
        payload: dto.ReviewUserRequestRequest
    ) {
        return this.apiPostAsync(
            `/admin/requests/${encodeURIComponent(publicId)}/review`,
            dto.ReviewUserRequestRequestSchema,
            dto.UserRequestResponseSchema,
            payload
        );
    }

    static async login(payload: dto.LoginRequest) {
        return this.apiPostAsync(
            `/auth/login`,
            dto.LoginRequestSchema,
            dto.LoginResponseSchema,
            payload
        );
    }

    static async logoutUser() {
        return this.apiGetAsync(`/auth/logout`, dto.OkResponseSchema);
    }

    static async register(payload: dto.RegisterRequest) {
        return this.apiPostAsync(
            `/auth/register`,
            dto.RegisterRequestSchema,
            dto.RegisterResponseSchema,
            payload
        );
    }

    static async getSessionId() {
        return this.apiGetAsync(
            `/auth/session-id`,
            dto.SessionIdResponseSchema
        );
    }

    static async createBookmark(payload: dto.CreateBookmarkRequest) {
        return this.apiPostAsync(
            `/bookmark`,
            dto.CreateBookmarkRequestSchema,
            dto.BookmarkResponseSchema,
            payload
        );
    }

    static async getBookmarks(payload: dto.GetBookmarksRequest) {
        return this.apiPostAsync(
            `/bookmark/list`,
            dto.GetBookmarksRequestSchema,
            dto.BookmarkListResponseSchema,
            payload
        );
    }

    static async deleteBookmark(publicId: string) {
        return this.apiDeleteAsync(
            `/bookmark/${encodeURIComponent(publicId)}`,
            dto.OkResponseSchema
        );
    }

    static async updateBookmark(
        publicId: string,
        payload: dto.UpdateBookmarkRequest
    ) {
        return this.apiPostAsync(
            `/bookmark/${encodeURIComponent(publicId)}`,
            dto.UpdateBookmarkRequestSchema,
            dto.BookmarkResponseSchema,
            payload
        );
    }

    static async getUserPlaylistsAsync() {
        return this.apiGetAsync(
            `/default/playlist`,
            dto.UserPlaylistsResponseSchema
        );
    }

    static async createPlaylistAsync(payload: dto.CreatePlaylistRequest) {
        return this.apiPostAsync(
            `/default/playlist/create`,
            dto.CreatePlaylistRequestSchema,
            dto.BasePlaylistWithMediasResponseSchema,
            payload
        );
    }

    static async deletePlaylistAsync(playlistPublicId: string) {
        return this.apiDeleteAsync(
            `/default/playlist/${encodeURIComponent(playlistPublicId)}`,
            dto.OkResponseSchema
        );
    }

    static async getDefaultPlaylistAsync(
        playlistPublicId: string,
        offset?: number,
        limit?: number,
        query?: string
    ) {
        const queryParams = new URLSearchParams();
        if (offset !== undefined) queryParams.append("offset", `${offset}`);
        if (limit !== undefined) queryParams.append("limit", `${limit}`);
        if (query !== undefined) queryParams.append("query", `${query}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/default/playlist/${encodeURIComponent(playlistPublicId)}${queryString ? `?${queryString}` : ""}`,
            dto.BasePlaylistWithMediasResponseSchema
        );
    }

    static async updatePlaylistAsync(
        playlistPublicId: string,
        payload: dto.UpdatePlaylistRequest
    ) {
        return this.apiPatchAsync(
            `/default/playlist/${encodeURIComponent(playlistPublicId)}`,
            dto.BasePlaylistWithMediasResponseSchema,
            payload
        );
    }

    static async addContributorAsync(
        playlistPublicId: string,
        payload: dto.AddContributorRequest
    ) {
        return this.apiPostAsync(
            `/default/playlist/${encodeURIComponent(playlistPublicId)}/contributor`,
            dto.AddContributorRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async removeContributorAsync(
        playlistPublicId: string,
        targetUserPublicId: string
    ) {
        return this.apiDeleteAsync(
            `/default/playlist/${encodeURIComponent(playlistPublicId)}/contributor/${encodeURIComponent(targetUserPublicId)}`,
            dto.OkResponseSchema
        );
    }

    static async addMediaToPlaylistAsync(
        playlistPublicId: string,
        payload: dto.AddMediaToPlaylistRequest
    ) {
        return this.apiPostAsync(
            `/default/playlist/${encodeURIComponent(playlistPublicId)}/media`,
            dto.AddMediaToPlaylistRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async removeMediaFromPlaylistAsync(
        playlistPublicId: string,
        playlistMediaPublicId: string
    ) {
        return this.apiDeleteAsync(
            `/default/playlist/${encodeURIComponent(playlistPublicId)}/media/${encodeURIComponent(playlistMediaPublicId)}`,
            dto.OkResponseSchema
        );
    }

    static async disableMediaAsync(
        playlistPublicId: string,
        playlistMediaPublicId: string
    ) {
        return this.apiGetAsync(
            `/default/playlist/${encodeURIComponent(playlistPublicId)}/media/${encodeURIComponent(playlistMediaPublicId)}/disable`,
            dto.OkResponseSchema
        );
    }

    static async enableMediaAsync(
        playlistPublicId: string,
        playlistMediaPublicId: string
    ) {
        return this.apiGetAsync(
            `/default/playlist/${encodeURIComponent(playlistPublicId)}/media/${encodeURIComponent(playlistMediaPublicId)}/enable`,
            dto.OkResponseSchema
        );
    }

    static async browseDownloads(
        page?: number,
        status?: string,
        kind?: string,
        q?: string
    ) {
        const queryParams = new URLSearchParams();
        if (page !== undefined) queryParams.append("page", `${page}`);
        if (status !== undefined) queryParams.append("status", `${status}`);
        if (kind !== undefined) queryParams.append("kind", `${kind}`);
        if (q !== undefined) queryParams.append("q", `${q}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/downloader/browse${queryString ? `?${queryString}` : ""}`,
            dto.DownloadBrowseResponseSchema
        );
    }

    static downloadZipURL() {
        return `${BACKEND_URL}/downloader/download-zip`;
    }

    static async getDownloads() {
        return this.apiGetAsync(
            `/downloader/downloads`,
            dto.DownloadsResponseSchema
        );
    }

    static async deleteDownload(publicId: string) {
        return this.apiDeleteAsync(
            `/downloader/downloads/${encodeURIComponent(publicId)}`,
            dto.OkResponseSchema
        );
    }

    static async retryDownload(publicId: string) {
        return this.apiFetchAsync(
            `/downloader/downloads/${encodeURIComponent(publicId)}/retry`,
            dto.OkResponseSchema,
            { method: "POST" }
        );
    }

    static async markDownloadSeen(publicId: string) {
        return this.apiGetAsync(
            `/downloader/downloads/${encodeURIComponent(publicId)}/seen`,
            dto.OkResponseSchema
        );
    }

    static async browseDownloadGroupItems(
        publicId: string,
        offset?: number,
        status?: string,
        q?: string
    ) {
        const queryParams = new URLSearchParams();
        if (offset !== undefined) queryParams.append("offset", `${offset}`);
        if (status !== undefined) queryParams.append("status", `${status}`);
        if (q !== undefined) queryParams.append("q", `${q}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/downloader/groups/${encodeURIComponent(publicId)}/items${queryString ? `?${queryString}` : ""}`,
            dto.DownloadItemsPageResponseSchema
        );
    }

    static async manageDownloadGroup(publicId: string, action: string) {
        return this.apiFetchAsync(
            `/downloader/groups/${encodeURIComponent(publicId)}/${encodeURIComponent(action)}`,
            dto.OkResponseSchema,
            { method: "POST" }
        );
    }

    static async getDownloadSettings() {
        return this.apiGetAsync(
            `/downloader/settings`,
            dto.DownloadSettingsResponseSchema
        );
    }

    static async updateDownloadSettings(payload: dto.DownloadSettingsResponse) {
        return this.apiPostAsync(
            `/downloader/settings`,
            dto.DownloadSettingsResponseSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async startDownload(payload: dto.StartDownloadRequest) {
        return this.apiPostAsync(
            `/downloader/start-downloads`,
            dto.StartDownloadRequestSchema,
            dto.StartDownloadResponseSchema,
            payload
        );
    }

    static async startDownloadFromSearch(payload: dto.StartFromSearchRequest) {
        return this.apiPostAsync(
            `/downloader/start-from-search`,
            dto.StartFromSearchRequestSchema,
            dto.StartDownloadFromUrlResponseSchema,
            payload
        );
    }

    static async startDownloadFromUrl(payload: dto.AddFromUrlRequest) {
        return this.apiPostAsync(
            `/downloader/start-from-url`,
            dto.AddFromUrlRequestSchema,
            dto.StartDownloadFromUrlResponseSchema,
            payload
        );
    }

    static async getFeaturedLastMonth() {
        return this.apiGetAsync(
            `/featured/last-month`,
            dto.BasePlaylistWithMediasResponseSchema
        );
    }

    static async getFeaturedLiked() {
        return this.apiGetAsync(
            `/featured/liked`,
            dto.BasePlaylistWithMediasResponseSchema
        );
    }

    static async getFeaturedMostListened() {
        return this.apiGetAsync(
            `/featured/most-listened`,
            dto.BasePlaylistWithMediasResponseSchema
        );
    }

    static async getFeaturedRecentMix() {
        return this.apiGetAsync(
            `/featured/recent-mix`,
            dto.BasePlaylistWithMediasResponseSchema
        );
    }

    static async getFeaturedYearRecap() {
        return this.apiGetAsync(
            `/featured/year-recap`,
            dto.BasePlaylistWithMediasResponseSchema
        );
    }

    static async createFeaturedQueue(
        publicId: string,
        payload: dto.CollectionQueueRequest
    ) {
        return this.apiPostAsync(
            `/featured/${encodeURIComponent(publicId)}/queue`,
            dto.CollectionQueueRequestSchema,
            dto.QueueResponseSchema,
            payload
        );
    }

    static async getFriends() {
        return this.apiGetAsync(`/friends`, dto.FriendListResponseSchema);
    }

    static async getFriendsActivity() {
        return this.apiGetAsync(
            `/friends/activity`,
            dto.FriendActivityResponseSchema
        );
    }

    static async blockUser(userPublicId: string) {
        return this.apiFetchAsync(
            `/friends/block/${encodeURIComponent(userPublicId)}`,
            dto.OkResponseSchema,
            { method: "POST" }
        );
    }

    static async unblockUser(userPublicId: string) {
        return this.apiDeleteAsync(
            `/friends/block/${encodeURIComponent(userPublicId)}`,
            dto.OkResponseSchema
        );
    }

    static async getBlockedUsers() {
        return this.apiGetAsync(
            `/friends/blocked`,
            dto.FriendListResponseSchema
        );
    }

    static async compareStats(userPublicId: string) {
        return this.apiGetAsync(
            `/friends/compare/${encodeURIComponent(userPublicId)}`,
            dto.CompareStatsResponseSchema
        );
    }

    static async getLeaderboard() {
        return this.apiGetAsync(
            `/friends/leaderboard`,
            dto.LeaderboardResponseSchema
        );
    }

    static async getMyLevel() {
        return this.apiGetAsync(`/friends/levels`, dto.UserLevelResponseSchema);
    }

    static async inviteToSession(payload: dto.ListenTogetherInviteRequest) {
        return this.apiPostAsync(
            `/friends/listen-together/invite`,
            dto.ListenTogetherInviteRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async joinSession(payload: dto.ListenTogetherJoinRequest) {
        return this.apiPostAsync(
            `/friends/listen-together/join`,
            dto.ListenTogetherJoinRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async leaveSession(payload: dto.ListenTogetherLeaveRequest) {
        return this.apiPostAsync(
            `/friends/listen-together/leave`,
            dto.ListenTogetherLeaveRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async getActiveSessions() {
        return this.apiGetAsync(
            `/friends/listen-together/sessions`,
            dto.ListenTogetherListResponseSchema
        );
    }

    static async syncSession(payload: dto.ListenTogetherSyncRequest) {
        return this.apiPostAsync(
            `/friends/listen-together/sync`,
            dto.ListenTogetherSyncRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async acceptFriendRequest(requestPublicId: string) {
        return this.apiFetchAsync(
            `/friends/request/${encodeURIComponent(requestPublicId)}/accept`,
            dto.OkResponseSchema,
            { method: "POST" }
        );
    }

    static async rejectFriendRequest(requestPublicId: string) {
        return this.apiFetchAsync(
            `/friends/request/${encodeURIComponent(requestPublicId)}/reject`,
            dto.OkResponseSchema,
            { method: "POST" }
        );
    }

    static async sendFriendRequest(userPublicId: string) {
        return this.apiFetchAsync(
            `/friends/request/${encodeURIComponent(userPublicId)}`,
            dto.OkResponseSchema,
            { method: "POST" }
        );
    }

    static async getFriendRequests() {
        return this.apiGetAsync(
            `/friends/requests`,
            dto.FriendRequestListResponseSchema
        );
    }

    static async searchUsers(q: string) {
        const queryParams = new URLSearchParams();
        queryParams.append("q", `${q}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/friends/search${queryString ? `?${queryString}` : ""}`,
            dto.FriendSearchResponseSchema
        );
    }

    static async shareMedia(payload: dto.ShareMediaRequest) {
        return this.apiPostAsync(
            `/friends/share`,
            dto.ShareMediaRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async getShareInbox() {
        return this.apiGetAsync(
            `/friends/share/inbox`,
            dto.SharedMediaInboxResponseSchema
        );
    }

    static async getShareSent() {
        return this.apiGetAsync(
            `/friends/share/sent`,
            dto.SharedMediaSentResponseSchema
        );
    }

    static async deleteShare(sharePublicId: string) {
        return this.apiDeleteAsync(
            `/friends/share/${encodeURIComponent(sharePublicId)}`,
            dto.OkResponseSchema
        );
    }

    static async markShareSeen(sharePublicId: string) {
        return this.apiFetchAsync(
            `/friends/share/${encodeURIComponent(sharePublicId)}/seen`,
            dto.OkResponseSchema,
            { method: "POST" }
        );
    }

    static async removeFriend(userPublicId: string) {
        return this.apiDeleteAsync(
            `/friends/${encodeURIComponent(userPublicId)}`,
            dto.OkResponseSchema
        );
    }

    static async getUserLevel(userPublicId: string) {
        return this.apiGetAsync(
            `/friends/${encodeURIComponent(userPublicId)}/level`,
            dto.UserLevelResponseSchema
        );
    }

    static async getFriendStats(userPublicId: string) {
        return this.apiGetAsync(
            `/friends/${encodeURIComponent(userPublicId)}/stats`,
            dto.FriendStatsResponseSchema
        );
    }

    static async getFriendStreak(userPublicId: string) {
        return this.apiGetAsync(
            `/friends/${encodeURIComponent(userPublicId)}/streak`,
            dto.FriendStreakResponseSchema
        );
    }

    static async getVibeScore(userPublicId: string) {
        return this.apiGetAsync(
            `/friends/${encodeURIComponent(userPublicId)}/vibe`,
            dto.VibeScoreResponseSchema
        );
    }

    static getImageURL(path: string) {
        return `${BACKEND_URL}/image/${encodeURIComponent(path)}`;
    }

    static async getLrclibLyricsBatchAsync(payload: dto.GetLyricsBatchRequest) {
        return this.apiPostAsync(
            `/lrclib/lyrics`,
            dto.GetLyricsBatchRequestSchema,
            dto.GetLyricsBatchResponseSchema,
            payload
        );
    }

    static async getLrclibLyricsAsync(publicId: string) {
        return this.apiGetAsync(
            `/lrclib/lyrics/${encodeURIComponent(publicId)}`,
            dto.GetLyricsResponseSchema
        );
    }

    static async updateLrclibLyricsTimestampsAsync(
        publicId: string,
        payload: dto.UpdateTimestampsRequest
    ) {
        return this.apiPatchAsync(
            `/lrclib/lyrics/${encodeURIComponent(publicId)}/timestamps`,
            dto.GetLyricsResponseSchema,
            payload
        );
    }

    static async getDynamicLyricsAsync(publicId: string, provider?: string) {
        const queryParams = new URLSearchParams();
        if (provider !== undefined)
            queryParams.append("provider", `${provider}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/lyrics/dynamic/${encodeURIComponent(publicId)}${queryString ? `?${queryString}` : ""}`,
            dto.BaseDynamicLyricsResponseSchema
        );
    }

    static async getLyricsAsync(publicId: string, provider?: string) {
        const queryParams = new URLSearchParams();
        if (provider !== undefined)
            queryParams.append("provider", `${provider}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/lyrics/${encodeURIComponent(publicId)}${queryString ? `?${queryString}` : ""}`,
            dto.BaseLyricsResponseSchema
        );
    }

    static async getLyricsCorrectionContextAsync(
        publicId: string,
        provider?: string
    ) {
        const queryParams = new URLSearchParams();
        if (provider !== undefined)
            queryParams.append("provider", `${provider}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/lyrics/${encodeURIComponent(publicId)}/correction-context${queryString ? `?${queryString}` : ""}`,
            dto.LyricsCorrectionContextResponseSchema
        );
    }

    static async getAlbum(
        publicId: string,
        offset?: number,
        limit?: number,
        query?: string
    ) {
        const queryParams = new URLSearchParams();
        if (offset !== undefined) queryParams.append("offset", `${offset}`);
        if (limit !== undefined) queryParams.append("limit", `${limit}`);
        if (query !== undefined) queryParams.append("query", `${query}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/media/album/${encodeURIComponent(publicId)}${queryString ? `?${queryString}` : ""}`,
            dto.BaseAlbumWithSongsResponseSchema
        );
    }

    static async getArtist(publicId: string) {
        return this.apiGetAsync(
            `/media/artist/${encodeURIComponent(publicId)}`,
            dto.BaseArtistResponseSchema
        );
    }

    static async getArtistCatalogPage(
        publicId: string,
        offset?: number,
        limit?: number
    ) {
        const queryParams = new URLSearchParams();
        if (offset !== undefined) queryParams.append("offset", `${offset}`);
        if (limit !== undefined) queryParams.append("limit", `${limit}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/media/artist/${encodeURIComponent(publicId)}/page${queryString ? `?${queryString}` : ""}`,
            dto.ArtistPageResponseSchema
        );
    }

    static async getArtistPageByName(
        name: string,
        offset?: number,
        limit?: number
    ) {
        const queryParams = new URLSearchParams();
        queryParams.append("name", `${name}`);
        if (offset !== undefined) queryParams.append("offset", `${offset}`);
        if (limit !== undefined) queryParams.append("limit", `${limit}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/media/artists/profile${queryString ? `?${queryString}` : ""}`,
            dto.ArtistPageResponseSchema
        );
    }

    static async getCollectionItems(
        publicId: string,
        offset?: number,
        limit?: number,
        query?: string
    ) {
        const queryParams = new URLSearchParams();
        if (offset !== undefined) queryParams.append("offset", `${offset}`);
        if (limit !== undefined) queryParams.append("limit", `${limit}`);
        if (query !== undefined) queryParams.append("query", `${query}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/media/collection/${encodeURIComponent(publicId)}/items${queryString ? `?${queryString}` : ""}`,
            dto.CollectionPageResponseSchema
        );
    }

    static async resolveCollectionQueue(publicId: string) {
        return this.apiGetAsync(
            `/media/collection/${encodeURIComponent(publicId)}/playable`,
            dto.QueueResponseSchema
        );
    }

    static async createCollectionQueue(
        publicId: string,
        payload: dto.CollectionQueueRequest
    ) {
        return this.apiPostAsync(
            `/media/collection/${encodeURIComponent(publicId)}/queue`,
            dto.CollectionQueueRequestSchema,
            dto.QueueResponseSchema,
            payload
        );
    }

    static getFrameURL(publicId: string, timestampMs: number) {
        const queryParams = new URLSearchParams();
        queryParams.append("timestamp_ms", `${timestampMs}`);
        const queryString = queryParams.toString();
        return `${BACKEND_URL}/media/frame/${encodeURIComponent(publicId)}${queryString ? `?${queryString}` : ""}`;
    }

    static async getPlaylist(
        publicId: string,
        offset?: number,
        limit?: number,
        query?: string
    ) {
        const queryParams = new URLSearchParams();
        if (offset !== undefined) queryParams.append("offset", `${offset}`);
        if (limit !== undefined) queryParams.append("limit", `${limit}`);
        if (query !== undefined) queryParams.append("query", `${query}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/media/playlist/${encodeURIComponent(publicId)}${queryString ? `?${queryString}` : ""}`,
            dto.BasePlaylistWithMediasResponseSchema
        );
    }

    static async searchAsync(payload: dto.SearchRequest) {
        return this.apiPostAsync(
            `/media/search`,
            dto.SearchRequestSchema,
            dto.SearchResultsResponseSchema,
            payload
        );
    }

    static async searchProviderAsync(payload: dto.SearchProviderRequest) {
        return this.apiPostAsync(
            `/media/search/provider`,
            dto.SearchProviderRequestSchema,
            dto.SearchProviderResponseSchema,
            payload
        );
    }

    static async searchProvidersAsync() {
        return this.apiGetAsync(
            `/media/search/providers`,
            dto.SearchProvidersResponseSchema
        );
    }

    static async getSong(publicId: string) {
        return this.apiGetAsync(
            `/media/song/${encodeURIComponent(publicId)}`,
            dto.BaseSongWithAlbumResponseSchema
        );
    }

    static async getAudioBounds(publicId: string) {
        return this.apiGetAsync(
            `/media/song/${encodeURIComponent(publicId)}/audio-bounds`,
            dto.AudioBoundsResponseSchema
        );
    }

    static async getRelatedSongs(
        publicId: string,
        limit?: number,
        external?: boolean
    ) {
        const queryParams = new URLSearchParams();
        if (limit !== undefined) queryParams.append("limit", `${limit}`);
        if (external !== undefined)
            queryParams.append("external", `${external}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/media/song/${encodeURIComponent(publicId)}/related${queryString ? `?${queryString}` : ""}`,
            dto.SongListResponseSchema
        );
    }

    static async getStationAsync(publicId: string) {
        return this.apiGetAsync(
            `/media/station/${encodeURIComponent(publicId)}`,
            dto.BaseStationResponseSchema
        );
    }

    static async addFromUrlAsync(payload: dto.AddFromUrlRequest) {
        return this.apiPostAsync(
            `/media/url/add`,
            dto.AddFromUrlRequestSchema,
            dto.AddFromUrlResponseSchema,
            payload
        );
    }

    static async matchUrlAsync(url: string) {
        const queryParams = new URLSearchParams();
        queryParams.append("url", `${url}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/media/url/match${queryString ? `?${queryString}` : ""}`,
            dto.UrlMatchResponseSchema
        );
    }

    static async getVideoAsync(publicId: string) {
        return this.apiGetAsync(
            `/media/video/${encodeURIComponent(publicId)}`,
            dto.BaseVideoResponseSchema
        );
    }

    static async deleteMediaFileAsync(publicId: string) {
        return this.apiDeleteAsync(
            `/media/${encodeURIComponent(publicId)}`,
            dto.OkResponseSchema
        );
    }

    static async getMediaAsync(publicId: string) {
        return this.apiGetAsync(
            `/media/${encodeURIComponent(publicId)}`,
            dto.MediaResponseSchema
        );
    }

    static async searchArtists(
        provider: string,
        name: string,
        offset?: number,
        limit?: number,
        refresh?: boolean
    ) {
        const queryParams = new URLSearchParams();
        queryParams.append("name", `${name}`);
        if (offset !== undefined) queryParams.append("offset", `${offset}`);
        if (limit !== undefined) queryParams.append("limit", `${limit}`);
        if (refresh !== undefined) queryParams.append("refresh", `${refresh}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/metadata/${encodeURIComponent(provider)}/artists/search${queryString ? `?${queryString}` : ""}`,
            dto.MetadataResponseSchema
        );
    }

    static async getMetadata(
        provider: string,
        entity: string,
        externalId: string,
        offset?: number,
        limit?: number,
        refresh?: boolean
    ) {
        const queryParams = new URLSearchParams();
        if (offset !== undefined) queryParams.append("offset", `${offset}`);
        if (limit !== undefined) queryParams.append("limit", `${limit}`);
        if (refresh !== undefined) queryParams.append("refresh", `${refresh}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/metadata/${encodeURIComponent(provider)}/${encodeURIComponent(entity)}/${encodeURIComponent(externalId)}${queryString ? `?${queryString}` : ""}`,
            dto.MetadataResponseSchema
        );
    }

    static async listNotifications(
        limit?: number,
        offset?: number,
        unreadOnly?: boolean
    ) {
        const queryParams = new URLSearchParams();
        if (limit !== undefined) queryParams.append("limit", `${limit}`);
        if (offset !== undefined) queryParams.append("offset", `${offset}`);
        if (unreadOnly !== undefined)
            queryParams.append("unread_only", `${unreadOnly}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/notifications${queryString ? `?${queryString}` : ""}`,
            dto.NotificationPageResponseSchema
        );
    }

    static async getNotificationDestination(publicId: string) {
        return this.apiGetAsync(
            `/notifications/${encodeURIComponent(publicId)}/destination`,
            dto.NotificationDestinationResponseSchema
        );
    }

    static async markNotificationRead(publicId: string) {
        return this.apiPatchAsync(
            `/notifications/${encodeURIComponent(publicId)}/read`,
            dto.NotificationResponseSchema
        );
    }

    static async searchStations(q: string) {
        const queryParams = new URLSearchParams();
        queryParams.append("q", `${q}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/radio/search${queryString ? `?${queryString}` : ""}`,
            dto.SearchResultsResponseSchema
        );
    }

    static async getStation(publicId: string) {
        return this.apiGetAsync(
            `/radio/station/${encodeURIComponent(publicId)}`,
            dto.BaseStationResponseSchema
        );
    }

    static async getStationsByCountry(country: string) {
        return this.apiGetAsync(
            `/radio/stations/by-country/${encodeURIComponent(country)}`,
            dto.BaseStationResponseSchema.array()
        );
    }

    static async getStationsWithGeo(limit?: number, offset?: number) {
        const queryParams = new URLSearchParams();
        if (limit !== undefined) queryParams.append("limit", `${limit}`);
        if (offset !== undefined) queryParams.append("offset", `${offset}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/radio/stations/geo${queryString ? `?${queryString}` : ""}`,
            dto.BaseStationResponseSchema.array()
        );
    }

    static async getRecommendationsForYou(limit?: number, external?: boolean) {
        const queryParams = new URLSearchParams();
        if (limit !== undefined) queryParams.append("limit", `${limit}`);
        if (external !== undefined)
            queryParams.append("external", `${external}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/recommendation/for-you${queryString ? `?${queryString}` : ""}`,
            dto.SongListResponseSchema
        );
    }

    static async getRecommendationsForPlaylist(
        publicId: string,
        limit?: number,
        external?: boolean
    ) {
        const queryParams = new URLSearchParams();
        if (limit !== undefined) queryParams.append("limit", `${limit}`);
        if (external !== undefined)
            queryParams.append("external", `${external}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/recommendation/playlist/${encodeURIComponent(publicId)}${queryString ? `?${queryString}` : ""}`,
            dto.SongListResponseSchema
        );
    }

    static async prepareRecommendations(
        payload: dto.PrepareRecommendationsRequest
    ) {
        return this.apiPostAsync(
            `/recommendation/prepare`,
            dto.PrepareRecommendationsRequestSchema,
            dto.SongListResponseSchema,
            payload
        );
    }

    static async createRequest(payload: dto.CreateUserRequestRequest) {
        return this.apiPostAsync(
            `/request`,
            dto.CreateUserRequestRequestSchema,
            dto.UserRequestResponseSchema,
            payload
        );
    }

    static async getMyRequests(limit?: number, offset?: number) {
        const queryParams = new URLSearchParams();
        if (limit !== undefined) queryParams.append("limit", `${limit}`);
        if (offset !== undefined) queryParams.append("offset", `${offset}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/request${queryString ? `?${queryString}` : ""}`,
            dto.UserRequestListResponseSchema
        );
    }

    static async getRockitAlbum(publicId: string) {
        return this.apiGetAsync(
            `/rockit/album/${encodeURIComponent(publicId)}`,
            dto.BaseAlbumWithSongsResponseSchema
        );
    }

    static async getRockitSong(publicId: string) {
        return this.apiGetAsync(
            `/rockit/song/${encodeURIComponent(publicId)}`,
            dto.BaseSongWithAlbumResponseSchema
        );
    }

    static async uploadRockitAlbum() {
        return this.apiFetchAsync(
            `/rockit/upload/album`,
            dto.UploadResponseSchema,
            { method: "POST" }
        );
    }

    static async getAlbumAsync(spotifyId: string) {
        return this.apiGetAsync(
            `/spotify/album/${encodeURIComponent(spotifyId)}`,
            dto.SpotifyAlbumResponseSchema
        );
    }

    static async getArtistAsync(spotifyId: string) {
        return this.apiGetAsync(
            `/spotify/artist/${encodeURIComponent(spotifyId)}`,
            dto.BaseArtistResponseSchema
        );
    }

    static async getSpotifyPlaylistAsync(spotifyId: string) {
        return this.apiGetAsync(
            `/spotify/playlist/${encodeURIComponent(spotifyId)}`,
            dto.BasePlaylistWithMediasResponseSchema
        );
    }

    static async getTrackAsync(spotifyId: string) {
        return this.apiGetAsync(
            `/spotify/track/${encodeURIComponent(spotifyId)}`,
            dto.SpotifyTrackResponseSchema
        );
    }

    static async getSpotifyScrapperAlbumAsync(spotifyId: string) {
        return this.apiGetAsync(
            `/spotify_scrapper/album/${encodeURIComponent(spotifyId)}`,
            dto.SpotifyScrapperAlbumResponseSchema
        );
    }

    static async getSpotifyScrapperArtistAsync(spotifyId: string) {
        return this.apiGetAsync(
            `/spotify_scrapper/artist/${encodeURIComponent(spotifyId)}`,
            dto.BaseArtistResponseSchema
        );
    }

    static async getSpotifyScrapperPlaylistAsync(spotifyId: string) {
        return this.apiGetAsync(
            `/spotify_scrapper/playlist/${encodeURIComponent(spotifyId)}`,
            dto.BasePlaylistWithMediasResponseSchema
        );
    }

    static async getSpotifyScrapperTrackAsync(spotifyId: string) {
        return this.apiGetAsync(
            `/spotify_scrapper/track/${encodeURIComponent(spotifyId)}`,
            dto.SpotifyScrapperTrackResponseSchema
        );
    }

    static async getHomeStats() {
        return this.apiGetAsync(`/stats/home`, dto.HomeStatsResponseSchema);
    }

    static async getStreak() {
        return this.apiGetAsync(`/stats/streak`, dto.StreakResponseSchema);
    }

    static async getUserStats(payload: dto.UserStatsRequest) {
        return this.apiPostAsync(
            `/stats/user`,
            dto.UserStatsRequestSchema,
            dto.UserStatsResponseSchema,
            payload
        );
    }

    static async getUserStatsV2(payload: dto.UserStatsRequest) {
        return this.apiPostAsync(
            `/stats/v2/user`,
            dto.UserStatsRequestSchema,
            dto.UserStatsV2ResponseSchema,
            payload
        );
    }

    static async getAllStorageObjects() {
        return this.apiGetAsync(
            `/storage-object`,
            dto.StorageObjectResponseSchema.array()
        );
    }

    static async getStorageObjectByKey(key: string) {
        return this.apiGetAsync(
            `/storage-object/by-key/${encodeURIComponent(key)}`,
            dto.StorageObjectResponseSchema
        );
    }

    static async getStorageObjectByPublicId(publicId: string) {
        return this.apiGetAsync(
            `/storage-object/by-public-id/${encodeURIComponent(publicId)}`,
            dto.StorageObjectResponseSchema
        );
    }

    static async deleteStorageObject(publicId: string) {
        return this.apiDeleteAsync(
            `/storage-object/${encodeURIComponent(publicId)}`,
            dto.OkResponseSchema
        );
    }

    static async getStorageObject(publicId: string) {
        return this.apiGetAsync(
            `/storage-object/${encodeURIComponent(publicId)}`,
            dto.StorageObjectResponseSchema
        );
    }

    static async startAlbumUpload(payload: dto.UploadAlbumRequest) {
        return this.apiPostAsync(
            `/upload/album/start`,
            dto.UploadAlbumRequestSchema,
            dto.StartUploadResponseSchema,
            payload
        );
    }

    static async startSongUpload(payload: dto.UploadSongRequest) {
        return this.apiPostAsync(
            `/upload/song/start`,
            dto.UploadSongRequestSchema,
            dto.StartUploadResponseSchema,
            payload
        );
    }

    static async startVideoUpload(payload: dto.UploadVideoRequest) {
        return this.apiPostAsync(
            `/upload/video/start`,
            dto.UploadVideoRequestSchema,
            dto.StartUploadResponseSchema,
            payload
        );
    }

    static async getUser() {
        return this.apiGetAsync(`/user`, dto.UserSettingsResponseSchema);
    }

    static async updateCrossfade(payload: dto.UpdateCrossfadeRequest) {
        return this.apiPostAsync(
            `/user/crossfade`,
            dto.UpdateCrossfadeRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async updateLang(payload: dto.UpdateLangRequest) {
        return this.apiPostAsync(
            `/user/lang`,
            dto.UpdateLangRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async addMediaToLibrary(mediaPublicId: string) {
        return this.apiGetAsync(
            `/user/library/media/${encodeURIComponent(mediaPublicId)}`,
            dto.OkResponseSchema
        );
    }

    static async removeMediaFromLibrary(mediaPublicId: string) {
        return this.apiDeleteAsync(
            `/user/library/media/${encodeURIComponent(mediaPublicId)}`,
            dto.OkResponseSchema
        );
    }

    static async getUserLibraryMedias() {
        return this.apiGetAsync(
            `/user/library/medias`,
            dto.LibraryMediasResponseSchema
        );
    }

    static async searchLibrarySongsAsync(
        query: string,
        offset?: number,
        limit?: number,
        sort?: string
    ) {
        const queryParams = new URLSearchParams();
        queryParams.append("query", `${query}`);
        if (offset !== undefined) queryParams.append("offset", `${offset}`);
        if (limit !== undefined) queryParams.append("limit", `${limit}`);
        if (sort !== undefined) queryParams.append("sort", `${sort}`);
        const queryString = queryParams.toString();
        return this.apiGetAsync(
            `/user/library/songs/search${queryString ? `?${queryString}` : ""}`,
            dto.LibrarySongSearchResponseSchema
        );
    }

    static async likeMediaAsync(payload: dto.LikeMediaRequest) {
        return this.apiPostAsync(
            `/user/like/media`,
            dto.LikeMediaRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async unlikeMedia(mediaPublicId: string) {
        return this.apiDeleteAsync(
            `/user/like/media/${encodeURIComponent(mediaPublicId)}`,
            dto.OkResponseSchema
        );
    }

    static async getLikedMedia() {
        return this.apiGetAsync(
            `/user/liked-media`,
            dto.LikedMediaResponseSchema
        );
    }

    static async getNavigationPinsAsync() {
        return this.apiGetAsync(
            `/user/navigation/pins`,
            dto.NavigationPinsResponseSchema
        );
    }

    static async pinNavigationMediaAsync(payload: dto.PinNavigationRequest) {
        return this.apiPostAsync(
            `/user/navigation/pins`,
            dto.PinNavigationRequestSchema,
            dto.NavigationPinsResponseSchema,
            payload
        );
    }

    static async unpinNavigationMediaAsync(publicId: string) {
        return this.apiDeleteAsync(
            `/user/navigation/pins/${encodeURIComponent(publicId)}`,
            dto.NavigationPinsResponseSchema
        );
    }

    static async getNotificationEvents() {
        return this.apiGetAsync(
            `/user/notification-events`,
            dto.NotificationEventResponseSchema.array()
        );
    }

    static async getNotificationSubscriptions() {
        return this.apiGetAsync(
            `/user/notification-subscriptions`,
            dto.NotificationSubscriptionsResponseSchema
        );
    }

    static async setNotificationSubscriptions(
        payload: dto.UpdateNotificationSubscriptionsRequest
    ) {
        return this.apiPatchAsync(
            `/user/notification-subscriptions`,
            dto.NotificationSubscriptionsResponseSchema,
            payload
        );
    }

    static async updatePassword(payload: dto.UpdatePasswordRequest) {
        return this.apiPostAsync(
            `/user/password`,
            dto.UpdatePasswordRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async getQueue() {
        return this.apiGetAsync(`/user/queue`, dto.QueueResponseSchema);
    }

    static async cycleRepeatMode() {
        return this.apiPatchAsync(`/user/repeat-mode`, dto.OkResponseSchema);
    }

    static async getSession() {
        return this.apiGetAsync(`/user/session`, dto.SessionResponseSchema);
    }

    static async updateVolume(payload: dto.UpdateVolumeRequest) {
        return this.apiPostAsync(
            `/user/volume`,
            dto.UpdateVolumeRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static downloadApkURL(filename: string) {
        return `${BACKEND_URL}/version/apk/${encodeURIComponent(filename)}`;
    }

    static async getLatestVersion() {
        return this.apiGetAsync(
            `/version/latest`,
            dto.LatestVersionResponseSchema
        );
    }

    static downloadLatestApkURL() {
        return `${BACKEND_URL}/version/latest/apk`;
    }

    static async getAllLanguages() {
        return this.apiGetAsync(
            `/vocabulary/languages`,
            dto.LanguagesResponseSchema
        );
    }

    static async getUserVocabulary() {
        return this.apiGetAsync(
            `/vocabulary/user`,
            dto.VocabularyResponseSchema
        );
    }

    static async getVocabularyByCode(langCode: string) {
        return this.apiGetAsync(
            `/vocabulary/${encodeURIComponent(langCode)}`,
            dto.VocabularyResponseSchema
        );
    }

    static getYoutubeMusicAudioURL(publicId: string) {
        return `${BACKEND_URL}/youtube-music/audio/${encodeURIComponent(publicId)}`;
    }

    static async getChanelAsync(youtubeId: string) {
        return this.apiGetAsync(
            `/youtube/chanel/${encodeURIComponent(youtubeId)}`,
            dto.YoutubeChannelResponseSchema
        );
    }

    static async getYoutubeVideoAsync(youtubeId: string) {
        return this.apiGetAsync(
            `/youtube/video/${encodeURIComponent(youtubeId)}`,
            dto.YoutubeVideoResponseSchema
        );
    }
}
