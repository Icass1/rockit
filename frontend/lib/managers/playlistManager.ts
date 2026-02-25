import { rockIt } from "@/lib/rockit/rockIt";
import apiFetch from "@/lib/utils/apiFetch";
import { PlaylistResponse } from "@/dto/rockItPlaylistResponse";
import { QueueListType } from "@/types/rockIt";
import { SongWithAlbum } from "../rockit/rockItSongWithAlbum";

export class PlaylistManager {
    // #region: Constructor

    constructor() {}

    // #endregion

    // #region: Methods

    async getSpotifyPlaylistAsync(publicId: string) {
        const response = await apiFetch(`/spotify/playlist/${publicId}`, {
            auth: false,
        });
        if (!response?.ok) {
            throw "Error fetching playlist.";
        }

        const responseJson = await response.json();

        return PlaylistResponse.parse(responseJson);
    }

    async playPlaylist(
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

    // #endregion
}
