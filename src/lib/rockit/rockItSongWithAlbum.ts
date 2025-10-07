import { RockItArtist } from "./rockItArtist";
import { RockItSongWithoutAlbum } from "./rockItSongWithoutAlbum";
import { RockItSongWithAlbumResponse } from "@/responses/rockItSongWithAlbumResponse";
import { RockItAlbumWithoutSongs } from "./rockItAlbumWithoutSongs";
import { createAtom } from "../store";

export class RockItSongWithAlbum extends RockItSongWithoutAlbum {
    static #instance: RockItSongWithAlbum[] = [];

    // #region: Read-only properties

    public readonly atom = createAtom<RockItSongWithAlbum[]>([this]);

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
    }: {
        publicId: string;
        name: string;
        artists: RockItArtist[];
        discNumber: number;
        downloaded: boolean;
        duration: number;
        album: RockItAlbumWithoutSongs;
        internalImageUrl: string | null;
        audioUrl: string | null;
    }) {
        super({
            publicId,
            name,
            artists,
            downloaded,
            discNumber,
            duration,
            internalImageUrl,
            audioUrl,
        });

        this.album = album;
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

        const newInstance = new RockItSongWithAlbum({
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

        RockItSongWithAlbum.#instance.push(newInstance);

        return newInstance;
    }

    static getExistingInstanceFromPublicId(publicId: string) {
        for (const instance of RockItSongWithAlbum.#instance) {
            if (instance.publicId == publicId) {
                return instance;
            }
        }
    }

    // #endregion
}
