import apiFetch from "@/lib/utils/apiFetch";
import { rockIt } from "@/lib/rockit/rockIt";
import { RockItAlbumWithSongsResponse } from "@/responses/rockItAlbumWithSongsResponse";
import { RockItSongWithAlbumResponse } from "@/responses/rockItSongWithAlbumResponse";

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

        return RockItAlbumWithSongsResponse.parse(responseJson);
    }

    async playAlbum(
        songs: RockItSongWithAlbumResponse[],
        listType: "album" | "playlist",
        listPublicId: string,
        startSongPublicId?: string
    ) {
        rockIt.queueManager.setSongs(songs, listType, listPublicId);

        if (startSongPublicId)
            rockIt.queueManager.moveToSong(startSongPublicId);
        else rockIt.queueManager.setIndex(0);

        rockIt.audioManager.play();
    }
}
