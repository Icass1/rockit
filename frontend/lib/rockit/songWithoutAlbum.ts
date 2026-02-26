import {
    BaseSongResponse,
    BaseSongResponseSchema,
} from "@/dto/baseSongResponse";
import { Artist } from "@/lib/rockit/artist";
import { createAtom } from "@/lib/store";

export class SongWithoutAlbum {
    static #instance: SongWithoutAlbum[] = [];

    public readonly atom = createAtom<[SongWithoutAlbum, number]>([this, 0]);

    public publicId: string;
    public name: string;
    public artists: Artist[];
    public downloaded: boolean;
    public discNumber: number;
    public duration: number;
    public internalImageUrl: string | null;
    public audioUrl: string | null;

    constructor({
        publicId,
        name,
        artists,
        downloaded,
        discNumber,
        duration,
        internalImageUrl,
        audioUrl,
    }: {
        publicId: string;
        name: string;
        artists: Artist[];
        discNumber: number;
        downloaded: boolean;
        duration: number;
        internalImageUrl: string | null;
        audioUrl: string | null;
    }) {
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

    static fromResponse(response: BaseSongResponse): SongWithoutAlbum {
        const existing = SongWithoutAlbum.#instance.find(
            (s) => s.publicId === response.publicId
        );
        if (existing) return existing;

        return new SongWithoutAlbum({
            publicId: response.publicId,
            name: response.name,
            artists: response.artists.map((artist) =>
                Artist.fromResponse(artist)
            ),
            duration: response.duration ?? 0,
            discNumber: response.discNumber ?? 1,
            downloaded: response.downloaded,
            internalImageUrl: response.internalImageUrl,
            audioUrl: response.audioSrc as string | null,
        });
    }

    static getExistingInstanceFromPublicId(publicId: string) {
        return SongWithoutAlbum.#instance.find((s) => s.publicId === publicId);
    }
}
