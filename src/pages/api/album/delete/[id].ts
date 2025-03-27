import type { APIContext } from "astro";

import { ENV } from "@/rockitEnv";
import { type AlbumDB } from "@/lib/db/album";
import { db } from "@/lib/db/db";
import { type SongDB } from "@/lib/db/song";

import * as path from "path";
import * as fs from "fs";

const SONGS_PATH = ENV.SONGS_PATH;

export async function GET(context: APIContext): Promise<Response> {
    const id = context.params.id as string;

    const album = (await db
        .prepare("SELECT * FROM album WHERE id = ?")
        .get(id)) as AlbumDB;

    if (!album) {
        return new Response("Album not found", { status: 404 });
    }

    album.songs.forEach(async (songId) => {
        const song = (await db
            .prepare("SELECT * FROM song WHERE id = ?")
            .get(songId)) as SongDB;
        if (!song || !song.path) {
            console.error("Song not found:", songId);
            return;
        }

        const songPath = path.join(SONGS_PATH, song.path);

        try {
            fs.rmSync(songPath);
        } catch {
            console.error("Error deleting song:", songPath);
        }

        db.prepare("DELETE FROM song WHERE id = ?").run(songId);
        console.warn("Deleted song:", songId);
    });

    db.prepare("DELETE FROM album WHERE id = ?").run(id);
    console.warn("Deleted album:", id);

    return new Response("OK");
}
