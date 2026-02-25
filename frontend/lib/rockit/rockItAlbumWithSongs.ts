import { RockItArtist } from "@/lib/rockit/rockItArtist";
import { RockItAlbumWithSongsResponse } from "@/dto/rockItAlbumWithSongsResponse";
import { RockItAlbumWithoutSongs } from "./rockItAlbumWithoutSongs";
import { RockItExternalImage } from "./rockItExternalImage";
import { RockItSongWithoutAlbum } from "./rockItSongWithoutAlbum";

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
        externalImages,
    }: {
        publicId: string;
        name: string;
        artists: RockItArtist[];
        songs: RockItSongWithoutAlbum[];
        releaseDate: string;
        internalImageUrl: string | null;
        externalImages: RockItExternalImage[];
    }) {
        super({
            publicId,
            name,
            artists,
            releaseDate,
            internalImageUrl,
            externalImages,
        });
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
            externalImages: response.externalImages.map((externalImage) =>
                RockItExternalImage.fromResponse(externalImage)
            ),
        });
    }
    update() {
        throw "RockItAlbumWithSongs.update not implemented";
    }

    // #endregion
}
