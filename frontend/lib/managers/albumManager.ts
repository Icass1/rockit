import { rockIt } from "@/lib/rockit/rockIt";
import apiFetch from "@/lib/utils/apiFetch";
import { AlbumWithSongsResponse } from "@/dto/rockItAlbumWithSongsResponse";
import { QueueListType } from "@/types/rockIt";
import { SongWithAlbum } from "../rockit/rockItSongWithAlbum";

export class AlbumManager {
    // #region: Constructor

    constructor() {}

    // #endregion: Constructor

    async getSpotifyAlbumAsync(publicId: string) {
        const response = await apiFetch(`/spotify/album/${publicId}`, {
            auth: false,
        });
        if (!response?.ok) {
            throw "Error fetching album.";
        }

        const responseJson = await response.json();

        return AlbumWithSongsResponse.parse(responseJson);
    }

    async playAlbum(
        songs: SongWithAlbum[],
        listType: QueueListType,
        listPublicId: string,
        startSongPublicId?: string
    ) {
        rockIt.queueManager.setSongs(songs, listType, listPublicId);

        if (startSongPublicId)
            rockIt.queueManager.moveToSong(startSongPublicId);
        else rockIt.queueManager.setQueueSongId(0);

        rockIt.audioManager.play();
    }
}
