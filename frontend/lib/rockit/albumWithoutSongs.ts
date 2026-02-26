import { BaseSongAlbumResponse } from "@/dto";
import { Artist } from "@/lib/rockit/artist";

export class AlbumWithoutSongs {
    public readonly publicId: string;
    public readonly name: string;
    public readonly artists: Artist[];
    public readonly releaseDate: string;
    public readonly internalImageUrl: string;
    public readonly type = "album";

    constructor({
        publicId,
        name,
        artists,
        releaseDate,
        internalImageUrl,
    }: {
        publicId: string;
        name: string;
        artists: Artist[];
        internalImageUrl: string;
        releaseDate: string;
    }) {
        this.publicId = publicId;
        this.name = name;
        this.artists = artists;
        this.internalImageUrl = internalImageUrl;
        this.releaseDate = releaseDate;
    }

    static fromResponse(response: BaseSongAlbumResponse): AlbumWithoutSongs {
        return new AlbumWithoutSongs({
            publicId: response.publicId,
            name: response.name,
            artists: response.artists.map((artist) =>
                Artist.fromResponse(artist)
            ),
            releaseDate: response.releaseDate,
            internalImageUrl: response.internalImageUrl,
        });
    }
}
