import { db } from "@/lib/db/db";
import type { PlaylistDBSong } from "@/lib/db/playlist";
import { parseSong, type RawSongDB, type SongDB } from "@/lib/db/song";
import { parseUser, type RawUserDB, type UserDB } from "@/lib/db/user";
import type { APIContext } from "astro";

export async function POST(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }

    const user = parseUser(
        db
            .prepare("SELECT likedSongs FROM user WHERE id = ?")
            .get(context.locals.user.id) as RawUserDB
    ) as UserDB<"likedSongs">;

    if (!user) {
        return new Response(
            "Interal server error. User is not in database but is logged in",
            { status: 500 }
        );
    }

    const id = context.params.id;

    const song = parseSong(
        db.prepare("SELECT id FROM song WHERE id = ?").get(id) as RawSongDB
    ) as SongDB<"id">;

    if (!song || !id) {
        return new Response("Song not found", { status: 404 });
    }

    if (user.likedSongs.find((song) => song.id == id)) {
        return new Response("Song already in liked list", { status: 400 });
    }

    db.prepare(`UPDATE user SET likedSongs = ? WHERE id = ?`).run(
        JSON.stringify([
            ...user?.likedSongs,
            {
                added_at: new Date().toISOString().split(".")[0] + "Z",
                id: id,
            } as PlaylistDBSong,
        ]),
        context.locals.user.id
    );

    return new Response("OK");
}

export async function DELETE(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }

    const user = parseUser(
        db
            .prepare("SELECT likedSongs FROM user WHERE id = ?")
            .get(context.locals.user.id) as RawUserDB
    ) as UserDB<"likedSongs">;

    if (!user) {
        return new Response(
            "Interal server error. User is not in database but is logged in",
            { status: 500 }
        );
    }

    const id = context.params.id;

    if (!user.likedSongs.find((song) => song.id == id)) {
        return new Response("Song not in liked list", { status: 400 });
    }

    db.prepare(`UPDATE user SET likedSongs = ? WHERE id = ?`).run(
        JSON.stringify([
            ...user?.likedSongs.filter((likedSong) => likedSong.id != id),
        ]),
        context.locals.user.id
    );

    return new Response("OK");
}
