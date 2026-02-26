import { AlbumWithoutSongs } from "@/lib/rockit/albumWithoutSongs";
import { Artist } from "@/lib/rockit/artist";
import { SongWithAlbum } from "@/lib/rockit/songWithAlbum";
import { SongWithoutAlbum } from "@/lib/rockit/songWithoutAlbum";
import { createAtom } from "@/lib/store";
import apiFetch from "@/lib/utils/apiFetch";

export class SongPlaylist {
    static #instance: SongPlaylist[] = [];

    public readonly atom = createAtom<[SongPlaylist]>([this]);

    public publicId: string;
    public name: string;
    public artists: Artist[];
    public downloaded: boolean;
    public discNumber: number;
    public duration: number;
    public internalImageUrl: string | null;
    public audioUrl: string | null;
    public readonly album: AlbumWithoutSongs;
    public readonly addedAt: Date;

    constructor({
        publicId,
        name,
        artists,
        downloaded,
        discNumber,
        duration,
        album,
        addedAt,
        audioUrl,
        internalImageUrl,
    }: {
        publicId: string;
        name: string;
        artists: Artist[];
        discNumber: number;
        downloaded: boolean;
        duration: number;
        album: AlbumWithoutSongs;
        addedAt: Date;
        audioUrl: string | null;
        internalImageUrl: string | null;
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
        this.addedAt = addedAt;
    }

    async updateAsync() {
        if (this.downloaded) {
            this.atom.set([this]);
            return;
        }
        const response = await apiFetch(`/spotify/song/${this.publicId}`);
        if (!response) return;
        const responseParsed = await response.json();
        this.downloaded = responseParsed.downloaded;
        this.audioUrl = responseParsed.audioUrl;
        this.internalImageUrl = responseParsed.internalImageUrl;
        this.atom.set([this]);
    }

    toSongWithoutAlbum() {
        return new SongWithoutAlbum({
            publicId: this.publicId,
            name: this.publicId,
            artists: this.artists,
            downloaded: this.downloaded,
            discNumber: this.discNumber,
            duration: this.duration,
            internalImageUrl: this.internalImageUrl,
            audioUrl: this.audioUrl,
        });
    }

    toSongWithAlbum() {
        return new SongWithAlbum({
            publicId: this.publicId,
            name: this.publicId,
            artists: this.artists,
            downloaded: this.downloaded,
            discNumber: this.discNumber,
            duration: this.duration,
            internalImageUrl: this.internalImageUrl,
            audioUrl: this.audioUrl,
            album: this.album,
        });
    }

    static fromResponse(
        response: {
            song: Parameters<typeof Artist.fromResponse>[];
            addedAt: string;
        } & {
            song: {
                publicId: string;
                name: string;
                artists: Parameters<typeof Artist.fromResponse>[];
                duration: number;
                discNumber: number;
                downloaded: boolean;
                album: Parameters<typeof AlbumWithoutSongs.fromResponse>;
                internalImageUrl: string | null;
                audioUrl: string | null;
            };
            addedAt: string;
        }
    ): SongPlaylist {
        const existing = SongPlaylist.#instance.find(
            (s) => s.publicId === response.song.publicId
        );
        if (existing) return existing;

        const newInstance = new SongPlaylist({
            publicId: response.song.publicId,
            name: response.song.name,
            artists: response.song.artists.map((artist) =>
                Artist.fromResponse(
                    artist as Parameters<typeof Artist.fromResponse>[0]
                )
            ),
            duration: response.song.duration,
            discNumber: response.song.discNumber,
            downloaded: response.song.downloaded,
            album: AlbumWithoutSongs.fromResponse(
                response.song.album as Parameters<
                    typeof AlbumWithoutSongs.fromResponse
                >[0]
            ),
            addedAt: new Date(response.addedAt),
            internalImageUrl: response.song.internalImageUrl,
            audioUrl: response.song.audioUrl,
        });

        SongPlaylist.#instance.push(newInstance);
        return newInstance;
    }

    static getExistingInstanceFromPublicId(publicId: string) {
        return SongPlaylist.#instance.find((s) => s.publicId === publicId);
    }
}
