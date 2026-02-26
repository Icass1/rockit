import { BaseArtistResponseSchema } from "@/dto/baseArtistResponse";
import { BaseSongAlbumResponseSchema } from "@/dto/baseSongAlbumResponse";
import { ExternalImageResponseSchema } from "@/dto/externalImageResponse";
import { Artist } from "@/lib/rockit/artist";
import { ExternalImage } from "@/lib/rockit/externalImage";

export class AlbumWithoutSongs {
    public readonly publicId: string;
    public readonly name: string;
    public readonly artists: Artist[];
    public readonly releaseDate: string;
    public readonly internalImageUrl: string | null;
    public readonly type = "album";
    public readonly externalImages: ExternalImage[];

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
        artists: Artist[];
        internalImageUrl: string | null;
        releaseDate: string;
        externalImages: ExternalImage[];
    }) {
        this.publicId = publicId;
        this.name = name;
        this.artists = artists;
        this.internalImageUrl = internalImageUrl;
        this.releaseDate = releaseDate;
        this.externalImages = externalImages;
    }

    static fromResponse(
        response: BaseSongAlbumResponseSchema & {
            externalImages?: ExternalImageResponseSchema[];
        }
    ): AlbumWithoutSongs {
        return new AlbumWithoutSongs({
            publicId: response.publicId,
            name: response.name,
            artists: response.artists.map((artist) =>
                Artist.fromResponse(artist)
            ),
            releaseDate: response.releaseDate,
            internalImageUrl: response.internalImageUrl,
            externalImages:
                response.externalImages?.map((externalImage) =>
                    ExternalImage.fromResponse(externalImage)
                ) ?? [],
        });
    }
}
