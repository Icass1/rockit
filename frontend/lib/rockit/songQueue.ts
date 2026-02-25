import { SongWithAlbum } from "./songWithAlbum";

type List = { type: string; publicId: string };

export class SongQueue {
    public readonly song: SongWithAlbum;
    public readonly queueSongId: number;
    public readonly list: List;

    constructor({ song, queueSongId, list }: {
        song: SongWithAlbum;
        queueSongId: number;
        list: List;
    }) {
        this.song = song;
        this.queueSongId = queueSongId;
        this.list = list;
    }
}
