import apiFetch from "@/lib/utils/apiFetch";
import { RockItSongWithAlbumResponse } from "@/dto/rockItSongWithAlbumResponse";
import { createAtom } from "../store";
import { RockItAlbumWithoutSongs } from "./rockItAlbumWithoutSongs";
import { RockItArtist } from "./rockItArtist";
import { RockItSongWithoutAlbum } from "./rockItSongWithoutAlbum";

type ConstructorArgs = {
    publicId: string;
    name: string;
    artists: RockItArtist[];
    discNumber: number;
    downloaded: boolean;
    duration: number;
    album: RockItAlbumWithoutSongs;
    internalImageUrl: string | null;
    audioUrl: string | null;
};

export class RockItSongWithAlbum {
    static #instance: RockItSongWithAlbum[] = [];

    // #region: Read-only properties

    public readonly atom = createAtom<[RockItSongWithAlbum]>([this]);

    public publicId: string;
    public name: string;
    public artists: RockItArtist[];
    public downloaded: boolean;
    public discNumber: number;
    public duration: number;
    public internalImageUrl: string | null;
    public audioUrl: string | null;
    public readonly album: RockItAlbumWithoutSongs;

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
        internalImageUrl,
        audioUrl,
    }: ConstructorArgs) {
        this.album = album;
        this.publicId = publicId;
        this.name = name;
        this.artists = artists;
        this.downloaded = downloaded;
        this.discNumber = discNumber;
        this.duration = duration;
        this.internalImageUrl = internalImageUrl;
        this.audioUrl = audioUrl;

        for (const instance of RockItSongWithAlbum.#instance) {
            if (instance.publicId == publicId) {
                return instance;
            }
        }

        // console.log("RockItSongWithAlbum.#instance.push(this)", this);

        RockItSongWithAlbum.#instance.push(this);
    }

    // #endregion

    // #region: Methods

    async updateAsync() {
        if (this.downloaded) return;
        const response = await apiFetch(`/spotify/song/${this.publicId}`);
        if (!response) {
            console.error("Response is undefined.");
            return;
        }
        const responseParsed = RockItSongWithAlbumResponse.parse(
            await response.json()
        );

        this.downloaded = responseParsed.downloaded;
        this.audioUrl = responseParsed.audioUrl;
        this.internalImageUrl = responseParsed.internalImageUrl;

        this.duration = 999;

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

    // #endregion

    // #region: Getters

    // #endregion

    // #region: Factories

    static fromResponse(
        response: RockItSongWithAlbumResponse
    ): RockItSongWithAlbum {
        for (const instance of RockItSongWithAlbum.#instance) {
            if (instance.publicId == response.publicId) {
                return instance;
            }
        }
        return new RockItSongWithAlbum({
            publicId: response.publicId,
            name: response.name,
            artists: response.artists.map((artist) =>
                RockItArtist.fromResponse(artist)
            ),
            duration: response.duration,
            discNumber: response.discNumber,
            downloaded: response.downloaded,
            album: RockItAlbumWithoutSongs.fromResponse(response.album),
            internalImageUrl: response.internalImageUrl,
            audioUrl: response.audioUrl,
        });
    }

    static getExistingInstanceFromPublicId(publicId: string) {
        // console.log(
        //     "RockItSongWithAlbum instances",
        //     RockItSongWithAlbum.#instance
        // );
        for (const instance of RockItSongWithAlbum.#instance) {
            if (instance.publicId == publicId) {
                return instance;
            }
        }
    }

    // #endregion
}
