import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db/db";
import { ENV } from "@/rockitEnv";
import { parseSong, RawSongDB, SongDB } from "@/lib/db/song";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const songDB = parseSong(
        db
            .prepare("SELECT path FROM song WHERE id = ?")
            .get(id.split("_")[0]) as RawSongDB
    ) as SongDB<"path">;

    if (!songDB || !songDB.path) {
        return new NextResponse("Song not found or not downloaded", {
            status: 404,
        });
    }

    const songPath = path.join(ENV.SONGS_PATH, songDB.path);

    try {
        const stat = fs.statSync(songPath);
        const total = stat.size;

        const range = req.headers.get("range");

        if (!range) {
            // No range specified: return full audio
            const fileStream = fs.createReadStream(songPath);

            const readableStream = new ReadableStream({
                start(controller) {
                    const onData = (
                        chunk: Buffer<ArrayBufferLike> | string
                    ) => {
                        try {
                            controller.enqueue(chunk);
                        } catch {
                            fileStream.destroy();
                        }
                    };

                    const onEnd = () => {
                        controller.close();
                        cleanup();
                    };

                    const onError = (err: object) => {
                        controller.error(err);
                        cleanup();
                    };

                    const cleanup = () => {
                        fileStream.off("data", onData);
                        fileStream.off("end", onEnd);
                        fileStream.off("error", onError);
                    };

                    fileStream.on("data", onData);
                    fileStream.on("end", onEnd);
                    fileStream.on("error", onError);
                },
                cancel() {
                    fileStream.destroy();
                },
            });
            return new NextResponse(readableStream, {
                status: 200,
                headers: {
                    "Content-Type": "audio/mpeg",
                    "Content-Length": total.toString(),
                    "Accept-Ranges": "bytes",
                    "Content-Disposition": "inline",
                },
            });
        }

        // Parse Range header
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : total - 1;

        if (start >= total || end >= total) {
            return new NextResponse("Range Not Satisfiable", {
                status: 416,
                headers: {
                    "Content-Range": `bytes */${total}`,
                },
            });
        }

        const chunkSize = end - start + 1;
        const fileStream = fs.createReadStream(songPath, { start, end });

        const readableStream = new ReadableStream({
            start(controller) {
                const onData = (chunk: Buffer<ArrayBufferLike> | string) => {
                    try {
                        controller.enqueue(chunk);
                    } catch {
                        fileStream.destroy();
                    }
                };

                const onEnd = () => {
                    controller.close();
                    cleanup();
                };

                const onError = (err: object) => {
                    controller.error(err);
                    cleanup();
                };

                const cleanup = () => {
                    fileStream.off("data", onData);
                    fileStream.off("end", onEnd);
                    fileStream.off("error", onError);
                };

                fileStream.on("data", onData);
                fileStream.on("end", onEnd);
                fileStream.on("error", onError);
            },
            cancel() {
                fileStream.destroy();
            },
        });

        return new NextResponse(readableStream, {
            status: 206, // Partial Content
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": chunkSize.toString(),
                "Content-Range": `bytes ${start}-${end}/${total}`,
                "Accept-Ranges": "bytes",
                "Content-Disposition": "inline",
            },
        });
    } catch (error) {
        return new NextResponse(`Error reading song ${error?.toString()}`, {
            status: 500,
        });
    }
}
