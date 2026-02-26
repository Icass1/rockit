import { BasePlaylistResponse } from "@/dto";
import { SongPlaylist } from "@/lib/rockit/songPlaylist";

export class Playlist {
    static #instance: Playlist[] = [];

    public readonly songs: SongPlaylist[];
    public readonly name: string;
    public readonly publicId: string;
    public readonly owner: string;
    public readonly internalImageUrl: string | null;
    public readonly type = "playlist";

    constructor({
        publicId,
        name,
        songs,
        internalImageUrl,
        owner,
    }: {
        publicId: string;
        name: string;
        songs: SongPlaylist[];
        internalImageUrl: string | null;
        owner: string;
    }) {
        this.songs = songs;
        this.name = name;
        this.publicId = publicId;
        this.internalImageUrl = internalImageUrl;
        this.owner = owner;

        const existing = Playlist.#instance.find(
            (p) => p.publicId === publicId
        );
        if (existing) return existing;
        Playlist.#instance.push(this);
    }

    static fromResponse(response: BasePlaylistResponse): Playlist {
        const existing = Playlist.#instance.find(
            (p) => p.publicId === response.publicId
        );
        if (existing) return existing;

        return new Playlist({
            publicId: response.publicId,
            name: response.name,
            internalImageUrl: response.internalImageUrl,
            songs: response.songs.map((song) =>
                SongPlaylist.fromResponse(song)
            ),
            owner: response.owner,
        });
    }
    update() {
        throw "Playlist.update not implemented";
    }
}
