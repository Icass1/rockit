import { RockItExternalImage } from "./rockItExternalImage";
import { RockItSongPlaylist } from "./rockItSongPlaylist";
import { RockItPlaylistResponse } from "@/responses/rockItPlaylistResponse";

export class RockItPlaylist {
    // #region: Read-only properties

    public readonly songs: RockItSongPlaylist[];
    public readonly name: string;
    public readonly publicId: string;
    public readonly owner: string;
    public readonly internalImageUrl: string | null;
    public readonly type = "playlist";
    public readonly externalImages: RockItExternalImage[];

    // #endregion

    // #region: Constructor

    constructor({
        publicId,
        name,
        songs,
        internalImageUrl,
        owner,
        externalImages,
    }: {
        publicId: string;
        name: string;
        songs: RockItSongPlaylist[];
        internalImageUrl: string | null;
        owner: string;
        externalImages: RockItExternalImage[];
    }) {
        this.songs = songs;
        this.name = name;
        this.publicId = publicId;
        this.internalImageUrl = internalImageUrl;
        this.owner = owner;
        this.externalImages = externalImages;
    }

    // #endregion

    // #region: Factories

    static fromResponse(response: RockItPlaylistResponse): RockItPlaylist {
        return new RockItPlaylist({
            publicId: response.publicId,
            name: response.name,
            internalImageUrl: response.internalImageUrl,
            songs: response.songs.map((song) =>
                RockItSongPlaylist.fromResponse(song)
            ),
            owner: response.owner,
            externalImages: response.externalImages.map((externalImage) =>
                RockItExternalImage.fromResponse(externalImage)
            ),
        });
    }
    update() {
        throw "RockItPlaylist.update not implemented";
    }

    // #endregion
}
