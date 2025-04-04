import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { db } from "@/lib/db/db";
import path from "path";
import { ENV } from "@/rockitEnv";
import { parseSong, RawSongDB, SongDB } from "@/lib/db/song";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params; // Get the dynamic "id" from the URL

    const songDB = parseSong(
        db
            .prepare("SELECT path FROM song WHERE id = ?")
            .get(id.split("_")[0]) as RawSongDB
    ) as SongDB<"path">;

    if (!songDB) {
        return new NextResponse("Song not found", { status: 404 });
    }

    if (!songDB.path) {
        return new NextResponse("Song is not downloaded", { status: 404 });
    }

    const songPath = path.join(ENV.SONGS_PATH, songDB.path);

    try {
        const stat = fs.statSync(songPath);
        const fileStream = fs.createReadStream(songPath);

        const readableStream = new ReadableStream({
            start(controller) {
                fileStream.on("data", (chunk) => controller.enqueue(chunk));
                fileStream.on("end", () => controller.close());
                fileStream.on("error", (err) => controller.error(err));
            },
        });

        return new NextResponse(readableStream, {
            headers: {
                "Content-Type": "audio/mp3",
                "Content-Disposition": "inline",
                "Content-Length": stat.size.toString(),
                "Cache-Control": "public, max-age=0, immutable",
            },
        });
    } catch (error) {
        return new NextResponse(`Error reading song ${error?.toString()}`, {
            status: 500,
        });
    }
}
