import apiFetch from "@/lib/utils/apiFetch";
import { RockItSongWithAlbumResponse } from "@/dto/rockItSongWithAlbumResponse";
import { RockItSongWithoutAlbumResponse } from "@/dto/rockItSongWithoutAlbumResponse";
import { createAtom } from "../store";
import { RockItArtist } from "./rockItArtist";

type ConstructorArgs = {
    publicId: string;
    name: string;
    artists: RockItArtist[];
    discNumber: number;
    downloaded: boolean;
    duration: number;
    internalImageUrl: string | null;
    audioUrl: string | null;
};

export class RockItSongWithoutAlbum {
    static #instance: RockItSongWithoutAlbum[] = [];

    // #region: Read-only properties

    public readonly atom = createAtom<[RockItSongWithoutAlbum, number]>([
        this,
        0,
    ]);

    public publicId: string;
    public name: string;
    public artists: RockItArtist[];
    public downloaded: boolean;
    public discNumber: number;
    public duration: number;
    public internalImageUrl: string | null;
    public audioUrl: string | null;

    // #endregion

    // #region: Constructor

    constructor({
        publicId,
        name,
        artists,
        downloaded,
        discNumber,
        duration,
        internalImageUrl,
        audioUrl,
    }: ConstructorArgs) {
        this.publicId = publicId;
        this.name = name;
        this.artists = artists;
        this.downloaded = downloaded;
        this.discNumber = discNumber;
        this.duration = duration;
        this.internalImageUrl = internalImageUrl;
        this.audioUrl = audioUrl;

        for (const instance of RockItSongWithoutAlbum.#instance) {
            if (instance.publicId == publicId) {
                return instance;
            }
        }

        // console.log("RockItSongWithoutAlbum.#instance.push(this)", this);

        RockItSongWithoutAlbum.#instance.push(this);
    }

    // #endregion

    // #region: Methods

    async updateAsync() {
        if (this.downloaded) return;
        // console.log(
        //     "(RockItSongWithoutAlbum.updateAsync)",
        //     this.publicId,
        //     this.name,
        //     this.downloaded
        // );
        const response = await apiFetch(`/spotify/song/${this.publicId}`);
        if (!response) {
            console.error("Response is undefined.");
            return;
        }
        const responseParsed = RockItSongWithAlbumResponse.parse(
            await response.json()
        );

        // console.log(
        //     "(RockItSongWithoutAlbum.updateAsync)",
        //     responseParsed,
        //     responseParsed.downloaded
        // );

        this.downloaded = responseParsed.downloaded;
        this.audioUrl = responseParsed.audioUrl;
        this.internalImageUrl = responseParsed.internalImageUrl;

        // console.log("(RockItSongWithoutAlbum.updateAsync)", this);
        // console.log("(RockItSongWithoutAlbum.updateAsync)", this.atom);

        this.atom.set([this, this.atom.get()[1] + 1]);
    }

    // #endregion

    // #region: Getters

    // #endregion

    // #region: Factories

    static fromResponse(
        response: RockItSongWithoutAlbumResponse
    ): RockItSongWithoutAlbum {
        for (const instance of RockItSongWithoutAlbum.#instance) {
            if (instance.publicId == response.publicId) {
                return instance;
            }
        }
        return new RockItSongWithoutAlbum({
            publicId: response.publicId,
            name: response.name,
            artists: response.artists.map((artist) =>
                RockItArtist.fromResponse(artist)
            ),
            duration: response.duration,
            discNumber: response.discNumber,
            downloaded: response.downloaded,
            internalImageUrl: response.internalImageUrl,
            audioUrl: response.audioUrl,
        });
    }

    static getExistingInstanceFromPublicId(publicId: string) {
        // console.log(
        //     "RockItSongWithoutAlbum instances",
        //     RockItSongWithoutAlbum.#instance
        // );

        for (const instance of RockItSongWithoutAlbum.#instance) {
            if (instance.publicId == publicId) {
                return instance;
            }
        }
    }

    // #endregion
}
