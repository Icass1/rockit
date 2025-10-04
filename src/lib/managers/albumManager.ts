import apiFetch from "@/lib/utils/apiFetch";
import { RockItAlbumWithSongs, RockItSongWithAlbum } from "@/types/rockIt";
import { rockIt } from "@/lib/rockit";

export class AlbumManager {
    constructor() {}

    async getSpotifyAlbumAsync(publicId: string) {
        const response = await apiFetch(`/spotify-album/${publicId}`, {
            auth: false,
        });
        if (!response?.ok) {
            throw "Error fetching album.";
        }

        const responseJson = await response?.json();

        return RockItAlbumWithSongs.parse(responseJson);
    }

    async playAlbum(
        songs: RockItSongWithAlbum[],
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
