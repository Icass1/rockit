import { BaseSongResponseSchema } from "@/dto/baseSongResponse";
import { AlbumWithoutSongs } from "@/lib/rockit/albumWithoutSongs";
import { Artist } from "@/lib/rockit/artist";
import { SongWithoutAlbum } from "@/lib/rockit/songWithoutAlbum";
import { createAtom } from "@/lib/store";

export class SongWithAlbum {
    static #instance: SongWithAlbum[] = [];

    public readonly atom = createAtom<[SongWithAlbum]>([this]);

    public publicId: string;
    public name: string;
    public artists: Artist[];
    public downloaded: boolean;
    public discNumber: number;
    public duration: number;
    public internalImageUrl: string | null;
    public audioUrl: string | null;
    public readonly album: AlbumWithoutSongs;

    constructor({
        publicId,
        name,
        artists,
        downloaded,
        discNumber,
        duration,
        album,
        internalImageUrl,
        audioUrl,
    }: {
        publicId: string;
        name: string;
        artists: Artist[];
        discNumber: number;
        downloaded: boolean;
        duration: number;
        album: AlbumWithoutSongs;
        internalImageUrl: string | null;
        audioUrl: string | null;
    }) {
        this.album = album;
        this.publicId = publicId;
        this.name = name;
        this.artists = artists;
        this.downloaded = downloaded;
        this.discNumber = discNumber;
        this.duration = duration;
        this.internalImageUrl = internalImageUrl;
        this.audioUrl = audioUrl;
    }

    async updateAsync() {}

    toSongWithoutAlbum() {
        return new SongWithoutAlbum({
            publicId: this.publicId,
            name: this.name,
            artists: this.artists,
            downloaded: this.downloaded,
            discNumber: this.discNumber,
            duration: this.duration,
            internalImageUrl: this.internalImageUrl,
            audioUrl: this.audioUrl,
        });
    }

    static fromResponse(response: BaseSongResponseSchema): SongWithAlbum {
        const existing = SongWithAlbum.#instance.find(
            (s) => s.publicId === response.publicId
        );
        if (existing) return existing;

        return new SongWithAlbum({
            publicId: response.publicId,
            name: response.name,
            artists: response.artists.map((artist) =>
                Artist.fromResponse(artist)
            ),
            duration: response.duration ?? 0,
            discNumber: response.discNumber ?? 1,
            downloaded: response.downloaded,
            album: AlbumWithoutSongs.fromResponse(response.album),
            internalImageUrl: response.internalImageUrl,
            audioUrl: response.audioSrc as string | null,
        });
    }

    static getExistingInstanceFromPublicId(publicId: string) {
        return SongWithAlbum.#instance.find((s) => s.publicId === publicId);
    }
}
