import { RockItArtistResponse } from "@/dto/rockItArtistResponse";
import { RockItExternalImage } from "./rockItExternalImage";

export class RockItArtist {
    // #region: Read-only properties

    public readonly publicId: string;
    public readonly name: string;
    public readonly internalImageUrl: string | null;
    public readonly externalImages: RockItExternalImage[];

    // #endregion

    // #region: Constructor

    constructor({
        publicId,
        name,
        internalImageUrl,
        externalImages,
    }: {
        publicId: string;
        name: string;
        internalImageUrl: string | null;
        externalImages: RockItExternalImage[];
    }) {
        this.publicId = publicId;
        this.name = name;
        this.internalImageUrl = internalImageUrl;
        this.externalImages = externalImages;
    }

    // #endregion

    // #region: Getters

    // #endregion

    // #region: Factories

    static fromResponse(response: RockItArtistResponse): RockItArtist {
        return new RockItArtist({
            publicId: response.publicId,
            name: response.name,
            internalImageUrl: response.internalImageUrl,
            externalImages: response.externalImages.map((exteralImage) =>
                RockItExternalImage.fromResponse(exteralImage)
            ),
        });
    }

    // #endregion
}
