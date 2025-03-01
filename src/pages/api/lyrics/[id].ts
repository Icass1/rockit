import { db } from "@/lib/db/db";
import {
    parseSong,
    type DynamicLyrics,
    type RawSongDB,
    type SongDB,
} from "@/lib/db/song";
import stringSimilarity from "@/lib/stringSimilarity";
import type { APIContext } from "astro";
import { Agent, setGlobalDispatcher } from "undici";

export async function GET(context: APIContext): Promise<Response> {
    const id = context.params.id as string;

    const song = parseSong(
        db
            .prepare(
                `SELECT artists,name,lyrics,dynamicLyrics FROM song WHERE id = ?`
            )
            .get(id) as RawSongDB
    ) as SongDB<"artists" | "name" | "lyrics" | "dynamicLyrics">;

    if (!song) {
        return new Response("Song not found", { status: 404 });
    }

    const url = new URL(
        `https://api.textyl.co/api/lyrics?q=${song.artists[0].name}-${song.name}`
    );

    console.log(url.toString());

    // if (song.dynamicLyrics && song.dynamicLyrics.length > 0) {
    //     console.log("Getting dynamicLyrics from database");
    //     return new Response(
    //         JSON.stringify({ dynamicLyrics: true, lyrics: song.dynamicLyrics }),
    //         {
    //             headers: {
    //                 "Content-Type": "application/json",
    //             },
    //         }
    //     );
    // }

    const agent = new Agent({
        connect: {
            rejectUnauthorized: false,
        },
    });

    setGlobalDispatcher(agent);

    const response = await fetch(url);
    if (response.ok) {
        const json = (await response.json()) as DynamicLyrics[];

        let lyricsSimilarity;

        if (song.lyrics) {
            lyricsSimilarity = stringSimilarity(
                json.map((line) => line.lyrics).join("\n"),
                song.lyrics
            );
        } else {
            console.log("Song has no lyrics");
        }

        if (lyricsSimilarity) {
            if (lyricsSimilarity > 50) {
                console.log("Adding dynamicLyrics to database");
                db.prepare(
                    `UPDATE song SET dynamicLyrics = ? WHERE id = ?`
                ).run(JSON.stringify(json), id);
            } else {
                console.log("Removing dynamicLyrics to database");
                db.prepare(
                    `UPDATE song SET dynamicLyrics = ? WHERE id = ?`
                ).run(undefined, id);

                return new Response(
                    JSON.stringify({
                        dynamicLyrics: false,
                        lyrics: song.lyrics,
                    }),
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
            }
        }

        if (json) {
            return new Response(
                JSON.stringify({ dynamicLyrics: true, lyrics: json }),
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }
    }

    return new Response(
        JSON.stringify({ dynamicLyrics: false, lyrics: song.lyrics }),
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );
}
