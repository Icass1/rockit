// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import * as dto from "@/dto";
import { BACKEND_URL } from "@/environment";
import { EPlatform } from "@/models/enums/platform";
import { IApiFetchOptions, TZodSchema } from "@/models/types/api";
import { FastApiError, HttpResult } from "@/models/types/http";

export class Http {
    static platform: EPlatform;

    private static async baseApiFetchMobileAsync(
        path: string,
        options: IApiFetchOptions = {}
    ): Promise<Response> {
        const { method = "GET", headers, body, signal } = options;

        const { getItemAsync } = await import("expo-secure-store");

        const SESSION_KEY = "session_id";

        const cookie = await getItemAsync(SESSION_KEY);

        const requestHeaders: Record<string, string> = {
            "Content-Type": "application/json",
            ...(typeof headers === "object" && !Array.isArray(headers)
                ? (headers as Record<string, string>)
                : {}),
            ...(cookie ? { Cookie: `session_id=${cookie}` } : {}),
        };

        return fetch(`${BACKEND_URL}${path}`, {
            method,
            headers: requestHeaders,
            body,
            credentials: "include",
            signal,
        });
    }

    private static async baseApiFetchWebAsync(
        path: string,
        options: IApiFetchOptions = {}
    ): Promise<Response> {
        const { method = "GET", headers, body, signal } = options;

        if (!path.startsWith("/")) {
            console.warn(`'${path}' doesn't start with /`);
        }

        if (typeof window === "undefined") {
            const { cookies } = await import("next/headers");
            const cookieStore = await cookies();
            const session = cookieStore.get("session_id")?.value;

            const existingHeaders =
                typeof headers === "object" && !Array.isArray(headers)
                    ? (headers as Record<string, string>)
                    : {};

            const requestHeaders: Record<string, string> = {
                ...existingHeaders,
                ...(session ? { Cookie: `session_id=${session}` } : {}),
            };

            return fetch(`${BACKEND_URL}${path}`, {
                method,
                headers: requestHeaders,
                body,
                cache: "no-store",
            });
        }

        return fetch(`${BACKEND_URL}${path}`, {
            method,
            headers,
            body,
            credentials: "include",
            signal,
        });
    }

    private static baseApiFetchAsync(
        path: string,
        options: IApiFetchOptions = {}
    ): Promise<Response> {
        if (Http.platform == EPlatform.Web) {
            return Http.baseApiFetchWebAsync(path, options);
        } else if ([EPlatform.Android, EPlatform.iOS].includes(Http.platform)) {
            return Http.baseApiFetchMobileAsync(path, options);
        } else {
            throw `Unkown platform ${Http.platform}`;
        }
    }

    private static async apiFetchAsync<T>(
        path: string,
        schema: TZodSchema<T>,
        options: IApiFetchOptions = {}
    ): Promise<HttpResult<T>> {
        let res: Response;

        try {
            res = await Http.baseApiFetchAsync(path, options);
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
        return Http.apiFetchAsync(path, responseSchema, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    }

    private static async apiGetAsync<T>(
        path: string,
        responseSchema: TZodSchema<T>
    ): Promise<HttpResult<T>> {
        return Http.apiFetchAsync(path, responseSchema, {
            method: "GET",
        });
    }

    private static async apiDeleteAsync<T>(
        path: string,
        responseSchema: TZodSchema<T>
    ): Promise<HttpResult<T>> {
        return Http.apiFetchAsync(path, responseSchema, {
            method: "DELETE",
        });
    }

    private static async apiPatchAsync<T>(
        path: string,
        responseSchema: TZodSchema<T>
    ): Promise<HttpResult<T>> {
        return Http.apiFetchAsync(path, responseSchema, {
            method: "PATCH",
        });
    }

    static async getSong(publicId: string) {
        return Http.apiGetAsync(
            `/media/song/${publicId}`,
            dto.BaseSongWithAlbumResponseSchema
        );
    }

    static async getAlbum(publicId: string) {
        return Http.apiGetAsync(
            `/media/album/${publicId}`,
            dto.BaseAlbumWithSongsResponseSchema
        );
    }

    static async getArtist(publicId: string) {
        return Http.apiGetAsync(
            `/media/artist/${publicId}`,
            dto.BaseArtistResponseSchema
        );
    }

    static async getPlaylist(publicId: string) {
        return Http.apiGetAsync(
            `/media/playlist/${publicId}`,
            dto.BasePlaylistWithMediasResponseSchema
        );
    }

    static async getVideoAsync(publicId: string) {
        return Http.apiGetAsync(
            `/media/video/${publicId}`,
            dto.BaseVideoResponseSchema
        );
    }

    static async search(payload: dto.SearchRequest) {
        return Http.apiPostAsync(
            `/media/search`,
            dto.SearchRequestSchema,
            dto.SearchResultsResponseSchema,
            payload
        );
    }

    static async getMedia(publicId: string) {
        return Http.apiGetAsync(`/media/${publicId}`, dto.MediaResponseSchema);
    }

    static async matchUrl() {
        return Http.apiGetAsync(`/media/url/match`, dto.UrlMatchResponseSchema);
    }

    static async addFromUrl(payload: dto.AddFromUrlRequest) {
        return Http.apiPostAsync(
            `/media/url/add`,
            dto.AddFromUrlRequestSchema,
            dto.AddFromUrlResponseSchema,
            payload
        );
    }

    static async startDownload(payload: dto.StartDownloadRequest) {
        return Http.apiPostAsync(
            `/downloader/start-downloads`,
            dto.StartDownloadRequestSchema,
            dto.StartDownloadResponseSchema,
            payload
        );
    }

    static async getDownloads() {
        return Http.apiGetAsync(
            `/downloader/downloads`,
            dto.DownloadsResponseSchema
        );
    }

    static async markDownloadSeen(publicId: string) {
        return Http.apiGetAsync(
            `/downloader/downloads/${publicId}/seen`,
            dto.OkResponseSchema
        );
    }

    static async getAllVocabulary() {
        return Http.apiGetAsync(`/vocabulary`, dto.VocabularyResponseSchema);
    }

    static async getUserVocabulary() {
        return Http.apiGetAsync(
            `/vocabulary/user`,
            dto.UserVocabularyResponseSchema
        );
    }

    static async getAllLanguages() {
        return Http.apiGetAsync(
            `/vocabulary/languages`,
            dto.LanguagesResponseSchema
        );
    }

    static async getUser() {
        return Http.apiGetAsync(`/user`, dto.UserSettingsResponseSchema);
    }

    static async getSession() {
        return Http.apiGetAsync(`/user/session`, dto.SessionResponseSchema);
    }

    static async getQueue() {
        return Http.apiGetAsync(`/user/queue`, dto.QueueResponseSchema);
    }

    static async getLibraryLists() {
        return Http.apiGetAsync(
            `/user/library/lists`,
            dto.LibraryListsResponseSchema
        );
    }

    static async getUserLibraryMedias() {
        return Http.apiGetAsync(
            `/user/library/medias`,
            dto.LibraryMediasResponseSchema
        );
    }

    static async addMediaToLibrary(mediaPublicId: string) {
        return Http.apiGetAsync(
            `/user/library/media/${mediaPublicId}`,
            dto.OkResponseSchema
        );
    }

    static async removeMediaFromLibrary(mediaPublicId: string) {
        return Http.apiDeleteAsync(
            `/user/library/media/${mediaPublicId}`,
            dto.OkResponseSchema
        );
    }

    static async getLikedMedia() {
        return Http.apiGetAsync(
            `/user/liked-media`,
            dto.LikedMediaResponseSchema
        );
    }

    static async unlikeMedia(mediaPublicId: string) {
        return Http.apiDeleteAsync(
            `/user/like/media/${mediaPublicId}`,
            dto.OkResponseSchema
        );
    }

    static async likeMediaAsync(payload: dto.LikeMediaRequest) {
        return Http.apiPostAsync(
            `/user/like/media`,
            dto.LikeMediaRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async updateLang(payload: dto.UpdateLangRequest) {
        return Http.apiPostAsync(
            `/user/lang`,
            dto.UpdateLangRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async updateCrossfade() {
        return Http.apiPatchAsync(`/user/crossfade`, dto.OkResponseSchema);
    }

    static async updatePassword() {
        return Http.apiPatchAsync(`/user/password`, dto.OkResponseSchema);
    }

    static async toggleRandomQueue() {
        return Http.apiPatchAsync(`/user/random-queue`, dto.OkResponseSchema);
    }

    static async cycleRepeatMode() {
        return Http.apiPatchAsync(`/user/repeat-mode`, dto.OkResponseSchema);
    }

    static async getUserStats(payload: dto.UserStatsRequest) {
        return Http.apiPostAsync(
            `/stats/user`,
            dto.UserStatsRequestSchema,
            dto.UserStatsResponseSchema,
            payload
        );
    }

    static async getHomeStats() {
        return Http.apiGetAsync(`/stats/home`, dto.HomeStatsResponseSchema);
    }

    static async getAllBuilds() {
        return Http.apiGetAsync(`/admin/builds`, dto.AllBuildsResponseSchema);
    }

    static async addBuild(payload: dto.AddVersionRequest) {
        return Http.apiPostAsync(
            `/admin/builds`,
            dto.AddVersionRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async uploadApk(payload: dto.UploadApkRequest) {
        return Http.apiPostAsync(
            `/admin/builds/upload`,
            dto.UploadApkRequestSchema,
            dto.UploadApkResponseSchema,
            payload
        );
    }

    static async startChunkedUpload(payload: dto.StartChunkedUploadRequest) {
        return Http.apiPostAsync(
            `/admin/builds/upload/start`,
            dto.StartChunkedUploadRequestSchema,
            dto.StartChunkedUploadResponseSchema,
            payload
        );
    }

    static async uploadChunk(payload: dto.UploadChunkRequest) {
        return Http.apiPostAsync(
            `/admin/builds/upload/chunk`,
            dto.UploadChunkRequestSchema,
            dto.UploadChunkResponseSchema,
            payload
        );
    }

    static async completeChunkedUpload(
        payload: dto.CompleteChunkedUploadRequest
    ) {
        return Http.apiPostAsync(
            `/admin/builds/upload/complete`,
            dto.CompleteChunkedUploadRequestSchema,
            dto.UploadApkResponseSchema,
            payload
        );
    }

    static async login(payload: dto.LoginRequest) {
        return Http.apiPostAsync(
            `/auth/login`,
            dto.LoginRequestSchema,
            dto.LoginResponseSchema,
            payload
        );
    }

    static async register(payload: dto.RegisterRequest) {
        return Http.apiPostAsync(
            `/auth/register`,
            dto.RegisterRequestSchema,
            dto.RegisterResponseSchema,
            payload
        );
    }

    static async logoutUser() {
        return Http.apiGetAsync(`/auth/logout`, dto.OkResponseSchema);
    }

    static async getLatestVersion() {
        return Http.apiGetAsync(
            `/version/latest`,
            dto.LatestVersionResponseSchema
        );
    }

    static async getAlbumAsync(spotifyId: string) {
        return Http.apiGetAsync(
            `/spotify/album/${spotifyId}`,
            dto.SpotifyAlbumResponseSchema
        );
    }

    static async getTrackAsync(spotifyId: string) {
        return Http.apiGetAsync(
            `/spotify/track/${spotifyId}`,
            dto.SpotifyTrackResponseSchema
        );
    }

    static async getArtistAsync(spotifyId: string) {
        return Http.apiGetAsync(
            `/spotify/artist/${spotifyId}`,
            dto.BaseArtistResponseSchema
        );
    }

    static async getSpotifyPlaylistAsync(spotifyId: string) {
        return Http.apiGetAsync(
            `/spotify/playlist/${spotifyId}`,
            dto.BasePlaylistWithMediasResponseSchema
        );
    }

    static async getYoutubeVideoAsync(youtubeId: string) {
        return Http.apiGetAsync(
            `/youtube/video/${youtubeId}`,
            dto.YoutubeVideoResponseSchema
        );
    }

    static async getChanelAsync(youtubeId: string) {
        return Http.apiGetAsync(
            `/youtube/chanel/${youtubeId}`,
            dto.YoutubeChannelResponseSchema
        );
    }

    static async createPlaylistAsync(payload: dto.CreatePlaylistRequest) {
        return Http.apiPostAsync(
            `/default/playlist/create`,
            dto.CreatePlaylistRequestSchema,
            dto.BasePlaylistWithMediasResponseSchema,
            payload
        );
    }

    static async getUserPlaylistsAsync() {
        return Http.apiGetAsync(
            `/default/playlist`,
            dto.UserPlaylistsResponseSchema
        );
    }

    static async getDefaultPlaylistAsync(playlistPublicId: string) {
        return Http.apiGetAsync(
            `/default/playlist/${playlistPublicId}`,
            dto.BasePlaylistWithMediasResponseSchema
        );
    }

    static async updatePlaylistAsync(playlistPublicId: string) {
        return Http.apiPatchAsync(
            `/default/playlist/${playlistPublicId}`,
            dto.BasePlaylistWithMediasResponseSchema
        );
    }

    static async deletePlaylistAsync(playlistPublicId: string) {
        return Http.apiDeleteAsync(
            `/default/playlist/${playlistPublicId}`,
            dto.OkResponseSchema
        );
    }

    static async addMediaToPlaylistAsync(
        playlistPublicId: string,
        payload: dto.AddMediaToPlaylistRequest
    ) {
        return Http.apiPostAsync(
            `/default/playlist/${playlistPublicId}/media`,
            dto.AddMediaToPlaylistRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async removeMediaFromPlaylistAsync(
        playlistPublicId: string,
        playlistMediaPublicId: string
    ) {
        return Http.apiDeleteAsync(
            `/default/playlist/${playlistPublicId}/media/${playlistMediaPublicId}`,
            dto.OkResponseSchema
        );
    }

    static async addContributorAsync(
        playlistPublicId: string,
        payload: dto.AddContributorRequest
    ) {
        return Http.apiPostAsync(
            `/default/playlist/${playlistPublicId}/contributor`,
            dto.AddContributorRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async removeContributorAsync(
        playlistPublicId: string,
        targetUserPublicId: string
    ) {
        return Http.apiDeleteAsync(
            `/default/playlist/${playlistPublicId}/contributor/${targetUserPublicId}`,
            dto.OkResponseSchema
        );
    }

    static async disableMediaAsync(
        playlistPublicId: string,
        playlistMediaPublicId: string
    ) {
        return Http.apiGetAsync(
            `/default/playlist/${playlistPublicId}/media/${playlistMediaPublicId}/disable`,
            dto.OkResponseSchema
        );
    }

    static async enableMediaAsync(
        playlistPublicId: string,
        playlistMediaPublicId: string
    ) {
        return Http.apiGetAsync(
            `/default/playlist/${playlistPublicId}/media/${playlistMediaPublicId}/enable`,
            dto.OkResponseSchema
        );
    }
}
