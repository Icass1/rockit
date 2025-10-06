import { RockItSongPlaylistResponse } from "@/responses/rockItSongPlaylistResponse";
import { RockItAlbumWithoutSongs } from "./rockItAlbumWithoutSongs";
import { RockItArtist } from "./rockItArtist";
import { RockItSongWithAlbum } from "./rockItSongWithAlbum";

export class RockItSongPlaylist extends RockItSongWithAlbum {
    // #region: Read-only properties

    public readonly addedAt: Date;

    // #endregion

    // #region: Constructor

    constructor({
        publicId,
        name,
        artists,
        downloaded,
        discNumber,
        duration,
        album,
        addedAt,
    }: {
        publicId: string;
        name: string;
        artists: RockItArtist[];
        discNumber: number;
        downloaded: boolean;
        duration: number;
        album: RockItAlbumWithoutSongs;
        addedAt: Date;
    }) {
        super({
            publicId,
            name,
            artists,
            downloaded,
            discNumber,
            duration,
            album,
        });
        this.addedAt = addedAt;
    }

    // #endregion

    // #region: Getters

    // #endregion

    // #region: Factories

    static fromResponse(
        response: RockItSongPlaylistResponse
    ): RockItSongPlaylist {
        return new RockItSongPlaylist({
            publicId: response.publicId,
            name: response.name,
            artists: response.artists.map((artist) =>
                RockItArtist.fromResponse(artist)
            ),
            duration: response.duration,
            discNumber: response.discNumber,
            downloaded: response.downloaded,
            album: RockItAlbumWithoutSongs.fromResponse(response.album),
            addedAt: response.addedAt,
        });
    }

    // #endregion
}
