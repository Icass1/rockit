import { RockItSongPlaylist } from "./rockItSongPlaylist";
import { RockItPlaylistResponse } from "@/responses/rockItPlaylistResponse";

export class RockItPlaylist {
    // #region: Read-only properties

    public readonly songs: RockItSongPlaylist[];
    public readonly name: string;
    public readonly publicId: string;
    public readonly owner: string;
    public readonly internalImageUrl: string | null;

    // #endregion

    // #region: Constructor

    constructor({
        publicId,
        name,
        songs,
        internalImageUrl,
        owner,
    }: {
        publicId: string;
        name: string;
        songs: RockItSongPlaylist[];
        internalImageUrl: string | null;
        owner: string;
    }) {
        this.songs = songs;
        this.name = name;
        this.publicId = publicId;
        this.internalImageUrl = internalImageUrl;
        this.owner = owner;
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
        });
    }
    update() {
        throw "RockItPlaylist.update not implemented";
    }

    // #endregion
}
