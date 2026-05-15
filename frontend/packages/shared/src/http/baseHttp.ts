// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import * as dto from "@/dto";
import { IApiFetchOptions, TZodSchema } from "@/models/types/api";
import { FastApiError, HttpResult } from "@/models/types/httpTypes";

export class BaseHttp {
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
        responseSchema: TZodSchema<T>
    ): Promise<HttpResult<T>> {
        return this.apiFetchAsync(path, responseSchema, {
            method: "PATCH",
        });
    }

    static async getSong(publicId: string) {
        return this.apiGetAsync(
            `/media/song/${publicId}`,
            dto.BaseSongWithAlbumResponseSchema
        );
    }

    static async getAlbum(publicId: string) {
        return this.apiGetAsync(
            `/media/album/${publicId}`,
            dto.BaseAlbumWithSongsResponseSchema
        );
    }

    static async getArtist(publicId: string) {
        return this.apiGetAsync(
            `/media/artist/${publicId}`,
            dto.BaseArtistResponseSchema
        );
    }

    static async getPlaylist(publicId: string) {
        return this.apiGetAsync(
            `/media/playlist/${publicId}`,
            dto.BasePlaylistWithMediasResponseSchema
        );
    }

    static async getVideoAsync(publicId: string) {
        return this.apiGetAsync(
            `/media/video/${publicId}`,
            dto.BaseVideoResponseSchema
        );
    }

    static async search(payload: dto.SearchRequest) {
        return this.apiPostAsync(
            `/media/search`,
            dto.SearchRequestSchema,
            dto.SearchResultsResponseSchema,
            payload
        );
    }

    static async getMedia(publicId: string) {
        return this.apiGetAsync(`/media/${publicId}`, dto.MediaResponseSchema);
    }

    static async matchUrl() {
        return this.apiGetAsync(`/media/url/match`, dto.UrlMatchResponseSchema);
    }

    static async addFromUrl(payload: dto.AddFromUrlRequest) {
        return this.apiPostAsync(
            `/media/url/add`,
            dto.AddFromUrlRequestSchema,
            dto.AddFromUrlResponseSchema,
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

    static async getDownloads() {
        return this.apiGetAsync(
            `/downloader/downloads`,
            dto.DownloadsResponseSchema
        );
    }

    static async markDownloadSeen(publicId: string) {
        return this.apiGetAsync(
            `/downloader/downloads/${publicId}/seen`,
            dto.OkResponseSchema
        );
    }

    static async getUserVocabulary() {
        return this.apiGetAsync(
            `/vocabulary/user`,
            dto.VocabularyResponseSchema
        );
    }

    static async getAllLanguages() {
        return this.apiGetAsync(
            `/vocabulary/languages`,
            dto.LanguagesResponseSchema
        );
    }

    static async getVocabularyByCode(langCode: string) {
        return this.apiGetAsync(
            `/vocabulary/${langCode}`,
            dto.VocabularyResponseSchema
        );
    }

    static async getUser() {
        return this.apiGetAsync(`/user`, dto.UserSettingsResponseSchema);
    }

    static async getSession() {
        return this.apiGetAsync(`/user/session`, dto.SessionResponseSchema);
    }

    static async getQueue() {
        return this.apiGetAsync(`/user/queue`, dto.QueueResponseSchema);
    }

    static async getUserLibraryMedias() {
        return this.apiGetAsync(
            `/user/library/medias`,
            dto.LibraryMediasResponseSchema
        );
    }

    static async addMediaToLibrary(mediaPublicId: string) {
        return this.apiGetAsync(
            `/user/library/media/${mediaPublicId}`,
            dto.OkResponseSchema
        );
    }

    static async removeMediaFromLibrary(mediaPublicId: string) {
        return this.apiDeleteAsync(
            `/user/library/media/${mediaPublicId}`,
            dto.OkResponseSchema
        );
    }

    static async getLikedMedia() {
        return this.apiGetAsync(
            `/user/liked-media`,
            dto.LikedMediaResponseSchema
        );
    }

    static async unlikeMedia(mediaPublicId: string) {
        return this.apiDeleteAsync(
            `/user/like/media/${mediaPublicId}`,
            dto.OkResponseSchema
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

    static async updateLang(payload: dto.UpdateLangRequest) {
        return this.apiPostAsync(
            `/user/lang`,
            dto.UpdateLangRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async updateCrossfade(payload: dto.UpdateCrossfadeRequest) {
        return this.apiPostAsync(
            `/user/crossfade`,
            dto.UpdateCrossfadeRequestSchema,
            dto.OkResponseSchema,
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

    static async toggleRandomQueue() {
        return this.apiPatchAsync(`/user/random-queue`, dto.OkResponseSchema);
    }

    static async cycleRepeatMode() {
        return this.apiPatchAsync(`/user/repeat-mode`, dto.OkResponseSchema);
    }

    static async getUserStats(payload: dto.UserStatsRequest) {
        return this.apiPostAsync(
            `/stats/user`,
            dto.UserStatsRequestSchema,
            dto.UserStatsResponseSchema,
            payload
        );
    }

    static async getHomeStats() {
        return this.apiGetAsync(`/stats/home`, dto.HomeStatsResponseSchema);
    }

    static async getAllBuilds() {
        return this.apiGetAsync(`/admin/builds`, dto.AllBuildsResponseSchema);
    }

    static async addBuild(payload: dto.AddVersionRequest) {
        return this.apiPostAsync(
            `/admin/builds`,
            dto.AddVersionRequestSchema,
            dto.OkResponseSchema,
            payload
        );
    }

    static async uploadApk(payload: dto.UploadApkRequest) {
        return this.apiPostAsync(
            `/admin/builds/upload`,
            dto.UploadApkRequestSchema,
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

    static async getRequestLogStats() {
        return this.apiGetAsync(
            `/admin/request-logs/stats`,
            dto.RequestLogStatsResponseSchema
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

    static async register(payload: dto.RegisterRequest) {
        return this.apiPostAsync(
            `/auth/register`,
            dto.RegisterRequestSchema,
            dto.RegisterResponseSchema,
            payload
        );
    }

    static async logoutUser() {
        return this.apiGetAsync(`/auth/logout`, dto.OkResponseSchema);
    }

    static async getLatestVersion() {
        return this.apiGetAsync(
            `/version/latest`,
            dto.LatestVersionResponseSchema
        );
    }

    static async getAlbumAsync(spotifyId: string) {
        return this.apiGetAsync(
            `/spotify/album/${spotifyId}`,
            dto.SpotifyAlbumResponseSchema
        );
    }

    static async getTrackAsync(spotifyId: string) {
        return this.apiGetAsync(
            `/spotify/track/${spotifyId}`,
            dto.SpotifyTrackResponseSchema
        );
    }

    static async getArtistAsync(spotifyId: string) {
        return this.apiGetAsync(
            `/spotify/artist/${spotifyId}`,
            dto.BaseArtistResponseSchema
        );
    }

    static async getSpotifyPlaylistAsync(spotifyId: string) {
        return this.apiGetAsync(
            `/spotify/playlist/${spotifyId}`,
            dto.BasePlaylistWithMediasResponseSchema
        );
    }

    static async getYoutubeVideoAsync(youtubeId: string) {
        return this.apiGetAsync(
            `/youtube/video/${youtubeId}`,
            dto.YoutubeVideoResponseSchema
        );
    }

    static async getChanelAsync(youtubeId: string) {
        return this.apiGetAsync(
            `/youtube/chanel/${youtubeId}`,
            dto.YoutubeChannelResponseSchema
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

    static async getUserPlaylistsAsync() {
        return this.apiGetAsync(
            `/default/playlist`,
            dto.UserPlaylistsResponseSchema
        );
    }

    static async getDefaultPlaylistAsync(playlistPublicId: string) {
        return this.apiGetAsync(
            `/default/playlist/${playlistPublicId}`,
            dto.BasePlaylistWithMediasResponseSchema
        );
    }

    static async updatePlaylistAsync(playlistPublicId: string) {
        return this.apiPatchAsync(
            `/default/playlist/${playlistPublicId}`,
            dto.BasePlaylistWithMediasResponseSchema
        );
    }

    static async deletePlaylistAsync(playlistPublicId: string) {
        return this.apiDeleteAsync(
            `/default/playlist/${playlistPublicId}`,
            dto.OkResponseSchema
        );
    }

    static async addMediaToPlaylistAsync(
        playlistPublicId: string,
        payload: dto.AddMediaToPlaylistRequest
    ) {
        return this.apiPostAsync(
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
        return this.apiDeleteAsync(
            `/default/playlist/${playlistPublicId}/media/${playlistMediaPublicId}`,
            dto.OkResponseSchema
        );
    }

    static async addContributorAsync(
        playlistPublicId: string,
        payload: dto.AddContributorRequest
    ) {
        return this.apiPostAsync(
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
        return this.apiDeleteAsync(
            `/default/playlist/${playlistPublicId}/contributor/${targetUserPublicId}`,
            dto.OkResponseSchema
        );
    }

    static async disableMediaAsync(
        playlistPublicId: string,
        playlistMediaPublicId: string
    ) {
        return this.apiGetAsync(
            `/default/playlist/${playlistPublicId}/media/${playlistMediaPublicId}/disable`,
            dto.OkResponseSchema
        );
    }

    static async enableMediaAsync(
        playlistPublicId: string,
        playlistMediaPublicId: string
    ) {
        return this.apiGetAsync(
            `/default/playlist/${playlistPublicId}/media/${playlistMediaPublicId}/enable`,
            dto.OkResponseSchema
        );
    }
}
