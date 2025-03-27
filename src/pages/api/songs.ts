import { db } from "@/lib/db/db";
import { type SongDB } from "@/lib/db/song";
import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
    let songs;
    try {
        const ids = context.url.searchParams.get("songs")?.split(",");

        if (ids) {
            songs = await Promise.all(
                ids.map(async (songID) => {
                    (await db
                        .prepare(
                            `SELECT ${
                                context.url.searchParams.get("q") || "*"
                            } FROM song WHERE id = ?`
                        )
                        .get(songID)) as SongDB;
                })
            );
        }

        // songs = context.url.searchParams
        //     .get("songs")
        //     ?.split(",")
        //     .map(
        //         async (songID) =>
        //             (await db
        //                 .prepare(
        //                     `SELECT ${
        //                         context.url.searchParams.get("q") || "*"
        //                     } FROM song WHERE id = ?`
        //                 )
        //                 .get(songID)) as SongDB
        //     );
    } catch (err) {
        return new Response(err?.toString(), { status: 404 });
    }

    if (!songs) {
        return new Response("Song not found", { status: 404 });
    }

    return new Response(JSON.stringify(songs), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
