import {
    API_ENDPOINTS,
    HttpResult,
    LibraryMediasResponseSchema,
    type LibraryMediasResponse,
} from "@rockit/shared";
import { apiFetch } from "@/lib/api";
import { addToLibrary } from "../database/access/libraryAccess";
import {
    createMediaFromDTO,
    getDownloadedMediaByUser,
    getLikedMediaByUser,
    getRecentMediaByUser,
} from "../database/access/mediaAccess";
import {
    createPlaylist,
    getPlaylistsByUser,
} from "../database/access/playlistAccess";
import { getUserById } from "../database/access/userAccess";
import { libraryTypeLiked } from "../database/schema";
import { checkNetworkConnection } from "../network";

async function getLibraryFromSqlite(): Promise<LibraryMediasResponse> {
    console.log("[getLibraryMedias] Getting library data from SQLite...");

    // Get user (assuming user id 1 for now - in real app would get from session)
    const user = await getUserById(1);
    const userId = user?.id ?? 1;
    console.log("[getLibraryMedias] User ID from SQLite:", userId);

    // Get liked songs
    console.log("[getLibraryMedias] Fetching liked songs from SQLite...");
    const likedSongs = await getLikedMediaByUser(userId, "song" as any, 50);
    console.log("[getLibraryMedias] Found liked songs:", likedSongs.length);

    // Get liked albums
    console.log("[getLibraryMedias] Fetching liked albums from SQLite...");
    const likedAlbums = await getLikedMediaByUser(userId, "album" as any, 50);
    console.log("[getLibraryMedias] Found liked albums:", likedAlbums.length);

    // Get liked videos
    console.log("[getLibraryMedias] Fetching liked videos from SQLite...");
    const likedVideos = await getLikedMediaByUser(userId, "video" as any, 50);
    console.log("[getLibraryMedias] Found liked videos:", likedVideos.length);

    // Get recent media
    console.log("[getLibraryMedias] Fetching recent media from SQLite...");
    const recentMedia = await getRecentMediaByUser(userId, 50);
    console.log("[getLibraryMedias] Found recent media:", recentMedia.length);

    // Get downloaded media
    console.log("[getLibraryMedias] Fetching downloaded media from SQLite...");
    const downloadedMedia = await getDownloadedMediaByUser(userId, 50);
    console.log(
        "[getLibraryMedias] Found downloaded media:",
        downloadedMedia.length
    );

    // Get user playlists
    console.log("[getLibraryMedias] Fetching playlists from SQLite...");
    const playlists = await getPlaylistsByUser(userId);
    console.log("[getLibraryMedias] Found playlists:", playlists.length);

    // Convert SQLite data to API response format
    // Note: This is a simplified conversion - needs proper mapping for the response schema
    const response: LibraryMediasResponse = {
        albums: likedAlbums.map((album) => ({
            type: "album" as const,
            provider: album.provider,
            publicId: album.publicId,
            url: album.url ?? "",
            providerUrl: album.providerUrl ?? "",
            name: album.name,
            imageUrl: album.imageUrl ?? "",
            releaseDate: album.releaseDate ?? "",
            artists: [],
        })),
        songs: likedSongs.map((song) => ({
            type: "song" as const,
            provider: song.provider,
            publicId: song.publicId,
            providerUrl: song.providerUrl ?? "",
            name: song.name,
            artists: [],
            audioSrc: song.audioSrc,
            downloaded: !!song.downloaded,
            imageUrl: song.imageUrl ?? "",
            duration_ms: song.durationMs ?? 0,
            discNumber: song.discNumber ?? 1,
            trackNumber: song.trackNumber ?? 1,
            album: {
                type: "album" as const,
                provider: song.provider,
                publicId: song.albumPublicId ?? "",
                url: "",
                providerUrl: "",
                name: song.albumName ?? "",
                imageUrl: song.imageUrl ?? "",
                releaseDate: "",
                artists: [],
            },
        })),
        videos: likedVideos.map((video) => ({
            type: "video" as const,
            provider: video.provider,
            publicId: video.publicId,
            providerUrl: video.providerUrl ?? "",
            name: video.name,
            artists: [],
            videoSrc: video.videoSrc ?? "",
            audioSrc: video.audioSrc ?? null,
            imageUrl: video.imageUrl ?? "",
            duration_ms: video.durationMs ?? 0,
            downloaded: !!video.downloaded,
        })),
        stations: [],
        playlists: playlists.map((playlist) => ({
            type: "playlist" as const,
            provider: playlist.provider,
            publicId: playlist.publicId,
            url: "",
            providerUrl: "",
            name: playlist.name,
            description: playlist.description ?? null,
            imageUrl: playlist.imageUrl ?? "",
            owner: playlist.owner,
            medias: [],
            contributors: [],
        })),
        shared: [],
    };

    console.log(
        "[getLibraryMedias] Successfully built library response from SQLite"
    );
    console.log("[getLibraryMedias] - Albums:", response.albums.length);
    console.log("[getLibraryMedias] - Songs:", response.songs.length);
    console.log("[getLibraryMedias] - Videos:", response.videos.length);
    console.log("[getLibraryMedias] - Stations:", response.stations.length);
    console.log("[getLibraryMedias] - Playlists:", response.playlists.length);
    console.log("[getLibraryMedias] - Shared:", response.shared.length);

    return response;
}

async function saveLibraryToSqlite(data: LibraryMediasResponse): Promise<void> {
    console.log("[getLibraryMedias] Saving library data to SQLite...");
    console.log("[getLibraryMedias] - Albums to save:", data.albums.length);
    console.log("[getLibraryMedias] - Songs to save:", data.songs.length);
    console.log("[getLibraryMedias] - Videos to save:", data.videos.length);
    console.log(
        "[getLibraryMedias] - Playlists to save:",
        data.playlists.length
    );

    // Get user (assuming user id 1 for now - in real app would get from session)
    const user = await getUserById(1);
    const userId = user?.id ?? 1;
    console.log("[getLibraryMedias] Using user ID:", userId);

    // Save songs
    console.log("[getLibraryMedias] Saving songs...");
    for (const song of data.songs) {
        try {
            const media = await createMediaFromDTO(song);
            await addToLibrary(userId, media.id, libraryTypeLiked);
            console.log("[getLibraryMedias] Saved song:", song.name);
        } catch (error) {
            console.log(
                "[getLibraryMedias] Error saving song:",
                song.name,
                error
            );
        }
    }

    // Save albums
    console.log("[getLibraryMedias] Saving albums...");
    for (const album of data.albums) {
        try {
            const media = await createMediaFromDTO(album);
            await addToLibrary(userId, media.id, libraryTypeLiked);
            console.log("[getLibraryMedias] Saved album:", album.name);
        } catch (error) {
            console.log(
                "[getLibraryMedias] Error saving album:",
                album.name,
                error
            );
        }
    }

    // Save videos
    console.log("[getLibraryMedias] Saving videos...");
    for (const video of data.videos) {
        try {
            const media = await createMediaFromDTO(video);
            await addToLibrary(userId, media.id, libraryTypeLiked);
            console.log("[getLibraryMedias] Saved video:", video.name);
        } catch (error) {
            console.log(
                "[getLibraryMedias] Error saving video:",
                video.name,
                error
            );
        }
    }

    // Save playlists
    console.log("[getLibraryMedias] Saving playlists...");
    for (const playlist of data.playlists) {
        try {
            await createPlaylist({
                publicId: playlist.publicId,
                userId: userId,
                name: playlist.name,
                description: playlist.description ?? undefined,
                imageUrl: playlist.imageUrl,
                owner: playlist.owner,
                provider: playlist.provider,
                isPublic: false,
            });
            console.log("[getLibraryMedias] Saved playlist:", playlist.name);
        } catch (error) {
            console.log(
                "[getLibraryMedias] Error saving playlist:",
                playlist.name,
                error
            );
        }
    }

    console.log("[getLibraryMedias] Successfully saved library data to SQLite");
}

export async function getLibraryMedias(): Promise<
    HttpResult<LibraryMediasResponse>
> {
    console.log("===========================================");
    console.log("[getLibraryMedias] Starting getLibraryMedias call...");
    console.log("===========================================");

    // Check network connection
    console.log("[getLibraryMedias] Step 1: Checking network connectivity...");
    const isOnline = await checkNetworkConnection();

    if (isOnline) {
        // Online: call API, return data, and update SQLite
        console.log("[getLibraryMedias] Online mode - calling API...");

        console.log(
            "[getLibraryMedias] Calling API endpoint:",
            API_ENDPOINTS.libraryMedias
        );
        const response = await apiFetch(
            API_ENDPOINTS.libraryMedias,
            LibraryMediasResponseSchema
        );

        if (response.isOk()) {
            console.log("[getLibraryMedias] API call successful!");

            // Save to SQLite in background (don't await)
            console.log("[getLibraryMedias] Saving API response to SQLite...");
            saveLibraryToSqlite(response.result).catch((error) => {
                console.log(
                    "[getLibraryMedias] Error saving to SQLite:",
                    error
                );
            });

            console.log("[getLibraryMedias] Returning API data");
            console.log("===========================================");
            return new HttpResult<LibraryMediasResponse>({
                ok: true,
                code: 200,
                message: "OK",
                result: response.result,
            });
        } else {
            console.log(
                "[getLibraryMedias] API call failed:",
                response.message
            );
            console.log("[getLibraryMedias] Falling back to SQLite...");

            // Fallback to SQLite on API error
            const sqliteData = await getLibraryFromSqlite();
            console.log("[getLibraryMedias] Returning SQLite fallback data");
            console.log("===========================================");
            return new HttpResult<LibraryMediasResponse>({
                ok: true,
                code: 200,
                message: "OK",
                result: sqliteData,
            });
        }
    } else {
        // Offline: get data from SQLite
        console.log("[getLibraryMedias] Offline mode - using SQLite data...");

        const sqliteData = await getLibraryFromSqlite();
        console.log("[getLibraryMedias] Returning SQLite data");
        console.log("===========================================");
        return new HttpResult<LibraryMediasResponse>({
            ok: true,
            code: 200,
            message: "OK",
            result: sqliteData,
        });
    }
}
