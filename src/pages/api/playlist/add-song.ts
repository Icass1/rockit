import { db } from "@/lib/db/db";
import {
    parsePlaylist,
    type PlaylistDB,
    type PlaylistDBSong,
    type RawPlaylistDB,
} from "@/lib/db/playlist";
import type { APIContext } from "astro";

export async function POST(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }

    const data = (await context.request.json()) as {
        songId: string;
        playlistId: string;
    };
    const list = parsePlaylist(
        db
            .prepare(`SELECT songs FROM playlist WHERE id = ?`)
            .get(data.playlistId) as RawPlaylistDB
    ) as PlaylistDB<"songs">;

    const song = db
        .prepare("SELECT id FROM song WHERE id = ?")
        .get(data.songId);

    if (!list) {
        return new Response("List not found", { status: 404 });
    }
    if (!song) {
        return new Response("Song not found", { status: 404 });
    }

    const newSongs: PlaylistDBSong[] = [
        ...list.songs,
        {
            id: data.songId,
            addedInRockit: true,
            added_at: new Date().toISOString(),
        },
    ];

    db.prepare(`UPDATE playlist SET songs = ? WHERE id = ?`).run(
        JSON.stringify(newSongs),
        data.playlistId
    );

    return new Response("OK");
}
