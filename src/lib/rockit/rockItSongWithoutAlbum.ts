import { RockItSongWithoutAlbumResponse } from "@/responses/rockItSongWithoutAlbumResponse";
import { RockItArtist } from "./rockItArtist";
import { createAtom } from "../store";
import apiFetch from "../utils/apiFetch";
import { RockItSongWithAlbumResponse } from "@/responses/rockItSongWithAlbumResponse";

export class RockItSongWithoutAlbum {
    static #instance: RockItSongWithoutAlbum[] = [];

    // #region: Read-only properties

    public readonly atom = createAtom<RockItSongWithoutAlbum[]>([this]);

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
    }: {
        publicId: string;
        name: string;
        artists: RockItArtist[];
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

    // #endregion

    // #region: Methods

    async updateAsync() {
        console.log("(updateAsync)", this.publicId, this.name, this.downloaded);
        const response = await apiFetch(`/spotify/song/${this.publicId}`);
        if (!response) {
            console.error("Response is undefined.");
            return;
        }
        const responseParsed = RockItSongWithAlbumResponse.parse(
            await response.json()
        );

        console.log("(updateAsync)", responseParsed, responseParsed.downloaded);

        this.downloaded = responseParsed.downloaded;
        this.audioUrl = responseParsed.audioUrl;
        this.internalImageUrl = responseParsed.internalImageUrl;

        console.log("(updateAsync)", this);
        console.log("(updateAsync)", this.atom);

        this.atom.set([]);
        this.atom.set([{ ...this }]);
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

        const newInstance = new RockItSongWithoutAlbum({
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

        RockItSongWithoutAlbum.#instance.push(newInstance);

        return newInstance;
    }

    static getExistingInstanceFromPublicId(publicId: string) {
        for (const instance of RockItSongWithoutAlbum.#instance) {
            if (instance.publicId == publicId) {
                return instance;
            }
        }
    }

    // #endregion
}
