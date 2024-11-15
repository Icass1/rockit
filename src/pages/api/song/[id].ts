import fs from 'fs';
import type { APIContext } from "astro";
import { db, Song, eq } from 'astro:db';

export async function GET(context: APIContext) {

    const { id } = context.params as { id: string }

    const song = await db.select().from(Song).where(eq(Song.song_id, id)).get()

    if (!song) {
        return new Response("Song not found", {status: 404})
    }

    const filePath = song.path;
    let stat
    try {
        stat = fs.statSync(filePath);
    } catch {
        return new Response("Song not found", {status: 404})
    }
    const fileSize = stat.size;
    const range = context.request.headers.get("range");

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const headers = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': 'audio/mpeg',
        };

        const audioStream = fs.createReadStream(filePath, { start, end });
        return new Response(audioStream as unknown as ReadableStream, { status: 206, headers });
    } else {
        const headers = {
            'Content-Length': fileSize.toString(),
            'Content-Type': 'audio/mpeg',
        };

        const audioStream = fs.createReadStream(filePath);
        return new Response(audioStream as unknown as ReadableStream, { status: 200, headers });
    }
}
