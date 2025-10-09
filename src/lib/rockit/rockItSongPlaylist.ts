import { RockItSongPlaylistResponse } from "@/responses/rockItSongPlaylistResponse";
import { RockItAlbumWithoutSongs } from "./rockItAlbumWithoutSongs";
import { RockItArtist } from "./rockItArtist";
import { createAtom } from "../store";

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
