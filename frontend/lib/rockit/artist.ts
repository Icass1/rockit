import { BaseArtistResponseSchema } from "@/dto/baseArtistResponse";
import { ExternalImage } from "@/lib/rockit/externalImage";

export class Artist {
    public readonly publicId: string;
    public readonly name: string;
    public readonly internalImageUrl: string | null;
    public readonly externalImages: ExternalImage[];

    constructor({
        publicId,
        name,
        internalImageUrl,
        externalImages,
    }: {
        publicId: string;
        name: string;
        internalImageUrl: string | null;
        externalImages: ExternalImage[];
    }) {
        this.publicId = publicId;
        this.name = name;
        this.internalImageUrl = internalImageUrl;
        this.externalImages = externalImages;
    }

    static fromResponse(response: BaseArtistResponseSchema): Artist {
        return new Artist({
            publicId: response.publicId,
            name: response.name,
            internalImageUrl: response.internalImageUrl,
            externalImages:
                response.externalImages?.map((img) =>
                    ExternalImage.fromResponse(img)
                ) ?? [],
        });
    }
}
