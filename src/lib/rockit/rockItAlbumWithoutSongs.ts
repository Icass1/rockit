import { RockItAlbumWithoutSongsResponse } from "@/responses/rockItAlbumWithoutSongsResponse";
import { RockItArtist } from "@/lib/rockit/rockItArtist";

export class RockItAlbumWithoutSongs {
    // #region: Read-only properties

    public readonly publicId: string;
    public readonly name: string;
    public readonly artists: RockItArtist[];
    public readonly releaseDate: string;
    public readonly internalImageUrl: string | null;

    // #endregion

    // #region: Constructor

    constructor({
        publicId,
        name,
        artists,
        releaseDate,
        internalImageUrl,
    }: {
        publicId: string;
        name: string;
        artists: RockItArtist[];
        internalImageUrl: string | null;
        releaseDate: string;
    }) {
        this.publicId = publicId;
        this.name = name;
        this.artists = artists;
        this.internalImageUrl = internalImageUrl;
        this.releaseDate = releaseDate;
    }

    // #endregion

    // #region: Factories

    static fromResponse(
        response: RockItAlbumWithoutSongsResponse
    ): RockItAlbumWithoutSongs {
        return new RockItAlbumWithoutSongs({
            publicId: response.publicId,
            name: response.name,
            artists: response.artists.map((artist) =>
                RockItArtist.fromResponse(artist)
            ),
            releaseDate: response.releaseDate,
            internalImageUrl: response.internalImageUrl,
        });
    }

    // #endregion
}
