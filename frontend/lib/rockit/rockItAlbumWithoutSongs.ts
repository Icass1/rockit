import { RockItArtist } from "@/lib/rockit/rockItArtist";
import { RockItExternalImage } from "@/lib/rockit/rockItExternalImage";
import { RockItAlbumWithoutSongsResponse } from "@/dto/rockItAlbumWithoutSongsResponse";

export class RockItAlbumWithoutSongs {
    // #region: Read-only properties

    public readonly publicId: string;
    public readonly name: string;
    public readonly artists: RockItArtist[];
    public readonly releaseDate: string;
    public readonly internalImageUrl: string | null;
    public readonly type = "album";
    public readonly externalImages: RockItExternalImage[];

    // #endregion

    // #region: Constructor

    constructor({
        publicId,
        name,
        artists,
        releaseDate,
        internalImageUrl,
        externalImages,
    }: {
        publicId: string;
        name: string;
        artists: RockItArtist[];
        internalImageUrl: string | null;
        releaseDate: string;
        externalImages: RockItExternalImage[];
    }) {
        this.publicId = publicId;
        this.name = name;
        this.artists = artists;
        this.internalImageUrl = internalImageUrl;
        this.releaseDate = releaseDate;
        this.externalImages = externalImages;
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
            externalImages: response.externalImages.map((externalImage) =>
                RockItExternalImage.fromResponse(externalImage)
            ),
        });
    }

    // #endregion
}
