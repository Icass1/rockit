import { RockItArtistResponse } from "@/responses/rockItArtistResponse";

export class RockItArtist {
    // #region: Read-only properties

    public readonly publicId: string;
    public readonly name: string;
    public readonly internalImageUrl: string | null;

    // #endregion

    // #region: Constructor

    constructor({
        publicId,
        name,
        internalImageUrl,
    }: {
        publicId: string;
        name: string;
        internalImageUrl: string | null;
    }) {
        this.publicId = publicId;
        this.name = name;
        this.internalImageUrl = internalImageUrl;
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
        });
    }

    // #endregion
}
