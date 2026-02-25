import { BaseSongResponseSchema } from "@/dto/baseSongResponse";
import { Artist } from "./artist";
import { AlbumWithoutSongs } from "./albumWithoutSongs";
import { ExternalImage } from "./externalImage";
import { SongWithoutAlbum } from "./songWithoutAlbum";

export class AlbumWithSongs extends AlbumWithoutSongs {
    public readonly songs: SongWithoutAlbum[];

    constructor({ publicId, name, artists, songs, internalImageUrl, releaseDate, externalImages }: {
        publicId: string;
        name: string;
        artists: Artist[];
        songs: SongWithoutAlbum[];
        releaseDate: string;
        internalImageUrl: string | null;
        externalImages: ExternalImage[];
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

    static fromResponse(
        response: {
            publicId: string;
            name: string;
            artists: Parameters<typeof Artist.fromResponse>[];
            releaseDate: string;
            internalImageUrl: string | null;
            songs: BaseSongResponseSchema[];
            externalImages: Parameters<typeof ExternalImage.fromResponse>[];
        }
    ): AlbumWithSongs {
        return new AlbumWithSongs({
            publicId: response.publicId,
            name: response.name,
            artists: response.artists.map((artist) =>
                Artist.fromResponse(artist as Parameters<typeof Artist.fromResponse>[0])
            ),
            releaseDate: response.releaseDate,
            internalImageUrl: response.internalImageUrl,
            songs: response.songs.map((song) =>
                SongWithoutAlbum.fromResponse(song)
            ),
            externalImages: response.externalImages.map((externalImage) =>
                ExternalImage.fromResponse(externalImage as Parameters<typeof ExternalImage.fromResponse>[0])
            ),
        });
    }
    update() {
        throw "AlbumWithSongs.update not implemented";
    }
}
