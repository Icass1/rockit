import { BaseArtistResponse } from "@/dto/baseArtistResponse";

export class Artist {
    public readonly publicId: string;
    public readonly name: string;
    public readonly internalImageUrl: string | null;

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

    static fromResponse(response: BaseArtistResponse): Artist {
        return new Artist({
            publicId: response.publicId,
            name: response.name,
            internalImageUrl: response.internalImageUrl,
        });
    }
}
