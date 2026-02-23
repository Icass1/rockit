import { RockItSongPlaylistResponse } from "@/dto/rockItSongPlaylistResponse";
import { RockItAlbumWithoutSongs } from "./rockItAlbumWithoutSongs";
import { RockItArtist } from "./rockItArtist";
import { createAtom } from "../store";
import { RockItSongWithoutAlbum } from "./rockItSongWithoutAlbum";
import { RockItSongWithAlbum } from "./rockItSongWithAlbum";
import apiFetch from "../utils/apiFetch";
import { RockItSongWithAlbumResponse } from "@/dto/rockItSongWithAlbumResponse";

export class RockItSongPlaylist {
    static #instance: RockItSongPlaylist[] = [];

    // #region: Read-only properties
    public readonly atom = createAtom<[RockItSongPlaylist]>([this]);

    public publicId: string;
    public name: string;
    public artists: RockItArtist[];
    public downloaded: boolean;
    public discNumber: number;
    public duration: number;
    public internalImageUrl: string | null;
    public audioUrl: string | null;
    public readonly album: RockItAlbumWithoutSongs;

    public readonly addedAt: Date;

    // #endregion

    // #region: Constructor

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
        artists: RockItArtist[];
        discNumber: number;
        downloaded: boolean;
        duration: number;
        album: RockItAlbumWithoutSongs;
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

    // #endregion

    async updateAsync() {
        console.log("(updateAsync)", this.publicId, this.name);
        if (this.downloaded) {
            console.log("(updateAsync) skiping", this.name);
            this.atom.set([this]);
            return;
        }
        const response = await apiFetch(`/spotify/song/${this.publicId}`);
        if (!response) {
            console.error("Response is undefined.");
            return;
        }
        const responseParsed = RockItSongWithAlbumResponse.parse(
            await response.json()
        );

        console.log("(updateAsync)", this.publicId, this.name, responseParsed);

        this.downloaded = responseParsed.downloaded;
        this.audioUrl = responseParsed.audioUrl;
        this.internalImageUrl = responseParsed.internalImageUrl;

        this.atom.set([this]);
    }

    toRockItSongWithoutAlbum() {
        return new RockItSongWithoutAlbum({
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

    toRockItSongWithAlbum() {
        return new RockItSongWithAlbum({
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

    // #region: Getters

    // #endregion

    // #region: Factories

    static fromResponse(
        response: RockItSongPlaylistResponse
    ): RockItSongPlaylist {
        for (const instance of RockItSongPlaylist.#instance) {
            if (instance.publicId == response.song.publicId) {
                return instance;
            }
        }

        const newInstance = new RockItSongPlaylist({
            publicId: response.song.publicId,
            name: response.song.name,
            artists: response.song.artists.map((artist) =>
                RockItArtist.fromResponse(artist)
            ),
            duration: response.song.duration,
            discNumber: response.song.discNumber,
            downloaded: response.song.downloaded,
            album: RockItAlbumWithoutSongs.fromResponse(response.song.album),
            addedAt: response.addedAt,
            internalImageUrl: response.song.internalImageUrl,
            audioUrl: response.song.audioUrl,
        });

        RockItSongPlaylist.#instance.push(newInstance);

        return newInstance;
    }

    static getExistingInstanceFromPublicId(publicId: string) {
        for (const instance of RockItSongPlaylist.#instance) {
            if (instance.publicId == publicId) {
                return instance;
            }
        }
    }

    // #endregion
}
