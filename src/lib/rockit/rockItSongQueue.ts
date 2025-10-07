import { QueueListType } from "@/types/rockIt";
import { RockItSongWithAlbum } from "./rockItSongWithAlbum";

type List = { type: QueueListType; publicId: string };

export class RockItSongQueue {
    // #region: Read-only properties

    public readonly song: RockItSongWithAlbum;
    public readonly index: number;
    public readonly list: List;

    // #endregion

    // #region: Constructor

    constructor({
        song,
        index,
        list,
    }: {
        song: RockItSongWithAlbum;
        index: number;
        list: List;
    }) {
        this.song = song;
        this.index = index;
        this.list = list;
    }

    // #endregion
}
