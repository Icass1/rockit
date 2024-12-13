import fs from "fs";
import path from "path";
import type { APIContext } from "astro";
import { db, type SongDB } from "@/lib/db";
import { ENV } from "@/rockitEnv";

const SONGS_PATH = ENV.SONGS_PATH;

export async function GET(context: APIContext) {
    const { id } = context.params as { id: string };

    const song = db
        .prepare("SELECT * FROM song WHERE id = ?")
        .get(id) as SongDB;
    if (!song) {
        return new Response("Song not found", { status: 404 });
    }

    if (!SONGS_PATH) {
        return new Response("SONGS_PATH is not set", { status: 404 });
    }

    if (!song.path) {
        return new Response("Song not found", { status: 404 });
    }
    // return new Response("Song not found", { status: 404 });

    const filePath = path.join(SONGS_PATH, song.path);
    let stat;
    try {
        stat = fs.statSync(filePath);
    } catch {
        return new Response("Song not found", { status: 404 });
    }

    const fileSize = stat.size;
    const range = context.request.headers.get("range");

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const headers = {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunkSize.toString(),
            "Content-Type": "audio/mpeg",
        };

        try {
            const audioStream = fs.createReadStream(filePath, { start, end });
            return new Response(audioStream as unknown as ReadableStream, {
                status: 206,
                headers,
            });
        } catch (error) {
            return new Response("Error reading song", { status: 500 });
        }
    } else {
        const headers = {
            "Content-Length": fileSize.toString(),
            "Content-Type": "audio/mpeg",
        };
        try {
            const audioStream = fs.createReadStream(filePath);
            return new Response(audioStream as unknown as ReadableStream, {
                status: 200,
                headers,
            });
        } catch (error) {
            return new Response("Error reading song", { status: 500 });
        }
    }
}
