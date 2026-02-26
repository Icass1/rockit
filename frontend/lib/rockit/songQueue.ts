import { SongWithAlbum } from "@/lib/rockit/songWithAlbum";

export class SongQueue {
    public readonly song: SongWithAlbum;
    public readonly queueSongId: number;
    public readonly list: string;

    constructor({
        song,
        queueSongId,
        list,
    }: {
        song: SongWithAlbum;
        queueSongId: number;
        list: string;
    }) {
        this.song = song;
        this.queueSongId = queueSongId;
        this.list = list;
    }
}
