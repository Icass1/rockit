import { QueueListType } from "@/types/rockIt";
import { RockItSongWithAlbum } from "./rockItSongWithAlbum";

type List = { type: QueueListType; publicId: string };

export class RockItSongQueue {
    // #region: Read-only properties

    public readonly song: RockItSongWithAlbum;
    public readonly queueSongId: number;
    public readonly list: List;

    // #endregion

    // #region: Constructor

    constructor({
        song,
        queueSongId,
        list,
    }: {
        song: RockItSongWithAlbum;
        queueSongId: number;
        list: List;
    }) {
        this.song = song;
        this.queueSongId = queueSongId;
        this.list = list;
    }

    // #endregion
}
