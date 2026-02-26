import { ExternalImage } from "@/lib/rockit/externalImage";
import { SongPlaylist } from "@/lib/rockit/songPlaylist";

export class Playlist {
    static #instance: Playlist[] = [];

    public readonly songs: SongPlaylist[];
    public readonly name: string;
    public readonly publicId: string;
    public readonly owner: string;
    public readonly internalImageUrl: string | null;
    public readonly type = "playlist";
    public readonly externalImages: ExternalImage[];

    constructor({
        publicId,
        name,
        songs,
        internalImageUrl,
        owner,
        externalImages,
    }: {
        publicId: string;
        name: string;
        songs: SongPlaylist[];
        internalImageUrl: string | null;
        owner: string;
        externalImages: ExternalImage[];
    }) {
        this.songs = songs;
        this.name = name;
        this.publicId = publicId;
        this.internalImageUrl = internalImageUrl;
        this.owner = owner;
        this.externalImages = externalImages;

        const existing = Playlist.#instance.find(
            (p) => p.publicId === publicId
        );
        if (existing) return existing;
        Playlist.#instance.push(this);
    }

    static fromResponse(response: {
        publicId: string;
        name: string;
        songs: Parameters<typeof SongPlaylist.fromResponse>[];
        internalImageUrl: string | null;
        owner: string;
        externalImages: Parameters<typeof ExternalImage.fromResponse>[];
    }): Playlist {
        const existing = Playlist.#instance.find(
            (p) => p.publicId === response.publicId
        );
        if (existing) return existing;

        return new Playlist({
            publicId: response.publicId,
            name: response.name,
            internalImageUrl: response.internalImageUrl,
            songs: response.songs.map((song) =>
                SongPlaylist.fromResponse(
                    song as Parameters<typeof SongPlaylist.fromResponse>[0]
                )
            ),
            owner: response.owner,
            externalImages: response.externalImages.map((externalImage) =>
                ExternalImage.fromResponse(
                    externalImage as Parameters<
                        typeof ExternalImage.fromResponse
                    >[0]
                )
            ),
        });
    }
    update() {
        throw "Playlist.update not implemented";
    }
}
