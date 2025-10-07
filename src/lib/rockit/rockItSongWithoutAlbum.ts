import { RockItSongWithoutAlbumResponse } from "@/responses/rockItSongWithoutAlbumResponse";
import { RockItArtist } from "./rockItArtist";

export class RockItSongWithoutAlbum {
    // #region: Read-only properties

    public readonly publicId: string;
    public readonly name: string;
    public readonly artists: RockItArtist[];
    public readonly downloaded: boolean;
    public readonly discNumber: number;
    public readonly duration: number;
    public readonly internalImageUrl: string | null;
    public readonly audioUrl: string | null;

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

    // #region: Getters

    // #endregion

    // #region: Factories

    static fromResponse(
        response: RockItSongWithoutAlbumResponse
    ): RockItSongWithoutAlbum {
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

    // #endregion
}
