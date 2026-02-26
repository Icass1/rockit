import { BaseAlbumResponse } from "@/dto";
import { AlbumWithoutSongs } from "@/lib/rockit/albumWithoutSongs";
import { Artist } from "@/lib/rockit/artist";
import { SongWithoutAlbum } from "@/lib/rockit/songWithoutAlbum";

export class AlbumWithSongs extends AlbumWithoutSongs {
    public readonly songs: SongWithoutAlbum[];

    constructor({
        publicId,
        name,
        artists,
        songs,
        internalImageUrl,
        releaseDate,
    }: {
        publicId: string;
        name: string;
        artists: Artist[];
        songs: SongWithoutAlbum[];
        releaseDate: string;
        internalImageUrl: string;
    }) {
        super({
            publicId,
            name,
            artists,
            releaseDate,
            internalImageUrl,
        });
        this.songs = songs;
    }

    static fromResponse(response: BaseAlbumResponse): AlbumWithSongs {
        return new AlbumWithSongs({
            publicId: response.publicId,
            name: response.name,
            artists: response.artists.map((artist) =>
                Artist.fromResponse(artist)
            ),
            releaseDate: response.releaseDate,
            internalImageUrl: response.internalImageUrl,
            songs: response.songs.map((song) =>
                SongWithoutAlbum.fromResponse(song)
            ),
        });
    }
    update() {
        throw "AlbumWithSongs.update not implemented";
    }
}
