import { RockItSongPlaylistResponse } from "@/responses/rockItSongPlaylistResponse";
import { RockItAlbumWithoutSongs } from "./rockItAlbumWithoutSongs";
import { RockItArtist } from "./rockItArtist";
import { RockItSongWithAlbum } from "./rockItSongWithAlbum";

export class RockItSongPlaylist extends RockItSongWithAlbum {
    static #instance: RockItSongPlaylist[] = [];

    // #region: Read-only properties

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
        super({
            publicId,
            name,
            artists,
            downloaded,
            discNumber,
            duration,
            album,
            audioUrl,
            internalImageUrl,
        });
        this.addedAt = addedAt;
    }

    // #endregion

    // #region: Getters

    // #endregion

    // #region: Factories

    static fromResponse(
        response: RockItSongPlaylistResponse
    ): RockItSongPlaylist {
        for (const instance of RockItSongPlaylist.#instance) {
            if (instance.publicId == response.publicId) {
                return instance;
            }
        }

        const newInstance = new RockItSongPlaylist({
            publicId: response.publicId,
            name: response.name,
            artists: response.artists.map((artist) =>
                RockItArtist.fromResponse(artist)
            ),
            duration: response.duration,
            discNumber: response.discNumber,
            downloaded: response.downloaded,
            album: RockItAlbumWithoutSongs.fromResponse(response.album),
            addedAt: response.addedAt,
            internalImageUrl: response.internalImageUrl,
            audioUrl: response.audioUrl,
        });

        RockItSongPlaylist.#instance.push(newInstance);

        return newInstance;
    }

    static getExistingInstanceFromPublicId(publicId: string) {
        console.log(
            "RockItSongPlaylist instances",
            RockItSongPlaylist.#instance
        );

        for (const instance of RockItSongPlaylist.#instance) {
            if (instance.publicId == publicId) {
                return instance;
            }
        }
    }

    // #endregion
}
