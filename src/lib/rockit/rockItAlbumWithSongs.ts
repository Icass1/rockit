import { RockItArtist } from "@/lib/rockit/rockItArtist";
import { RockItSongWithoutAlbum } from "./rockItSongWithoutAlbum";
import { RockItAlbumWithoutSongs } from "./rockItAlbumWithoutSongs";
import { RockItAlbumWithSongsResponse } from "@/responses/rockItAlbumWithSongsResponse";

export class RockItAlbumWithSongs extends RockItAlbumWithoutSongs {
    // #region: Read-only properties

    public readonly songs: RockItSongWithoutAlbum[];

    // #endregion

    // #region: Constructor

    constructor({
        publicId,
        name,
        artists,
        songs,
        internalImageUrl,
        releaseDate,
    }: {
        publicId: string;
        name: string;
        artists: RockItArtist[];
        songs: RockItSongWithoutAlbum[];
        releaseDate: string;
        internalImageUrl: string | null;
    }) {
        super({ publicId, name, artists, releaseDate, internalImageUrl });
        this.songs = songs;
    }

    // #endregion

    // #region: Factories

    static fromResponse(
        response: RockItAlbumWithSongsResponse
    ): RockItAlbumWithSongs {
        return new RockItAlbumWithSongs({
            publicId: response.publicId,
            name: response.name,
            artists: response.artists.map((artist) =>
                RockItArtist.fromResponse(artist)
            ),
            releaseDate: response.releaseDate,
            internalImageUrl: response.internalImageUrl,
            songs: response.songs.map((song) =>
                RockItSongWithoutAlbum.fromResponse(song)
            ),
        });
    }
    update() {
        throw "RockItAlbumWithSongs.update not implemented";
    }

    // #endregion
}
