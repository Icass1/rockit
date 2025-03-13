import { db } from "@/lib/db/db";
import { parseSong, type RawSongDB, type SongDB } from "@/lib/db/song";
import stringSimilarity from "@/lib/stringSimilarity";
import type {
    OpenApiMusicLyrics,
    OpenApiMusicSongs,
} from "@/types/openapi.music.163.com";
import type { APIContext } from "astro";
import { Agent, setGlobalDispatcher } from "undici";

function parseLyrics(text: string): { seconds: number; lyrics: string }[] {
    return text
        .split("\n")
        .flatMap((line) => {
            const match = [...line.matchAll(/\[(\d{2}):(\d{2}\.\d{2,3})\]/g)];
            const lyrics = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, "").trim();

            if (
                match.length > 0 &&
                lyrics !== "" &&
                !lyrics.startsWith("作曲") &&
                !lyrics.startsWith("作词") &&
                !lyrics.startsWith("制作人")
            ) {
                return match.map((time) => {
                    const minutes = parseInt(time[1], 10);
                    const seconds = parseFloat(time[2]);
                    return {
                        seconds: minutes * 60 + seconds,
                        lyrics,
                    };
                });
            }
            return [];
        })
        .sort((a, b) => a.seconds - b.seconds);
}

export async function GET(context: APIContext): Promise<Response> {
    const id = context.params.id as string;

    const song = parseSong(
        db
            .prepare(
                `SELECT artists,name,lyrics,dynamicLyrics,albumName FROM song WHERE id = ?`
            )
            .get(id) as RawSongDB
    ) as SongDB<"artists" | "name" | "lyrics" | "dynamicLyrics" | "albumName">;

    if (!song) {
        return new Response("Song not found", { status: 404 });
    }

    if (song.dynamicLyrics && song.dynamicLyrics.length > 0) {
        console.log("Getting dynamicLyrics from database");
        return new Response(
            JSON.stringify({ dynamicLyrics: true, lyrics: song.dynamicLyrics }),
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }

    const agent = new Agent({
        connect: {
            rejectUnauthorized: false,
        },
    });

    setGlobalDispatcher(agent);

    let response;
    try {
        response = await fetch(
            `http://openapi.music.163.com/api/search/get/?s=${song?.artists[0]?.name} ${song?.name}&type=1&limit=10`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );
    } catch {
        if (song.dynamicLyrics.length > 0) {
            return new Response(
                JSON.stringify({
                    dynamicLyrics: true,
                    lyrics: song.dynamicLyrics,
                }),
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        } else {
            return new Response(
                JSON.stringify({ dynamicLyrics: false, lyrics: song.lyrics }),
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }
    }
    if (response.ok) {
        const requestJson = (await response.json()) as OpenApiMusicSongs;

        requestJson.result.songs.sort(
            (a, b) =>
                stringSimilarity(
                    b?.name + b?.artists[0]?.name + b?.album?.name,
                    song?.name + song?.artists[0]?.name + song?.albumName
                ) -
                stringSimilarity(
                    a?.name + a?.artists[0]?.name + a?.album?.name,
                    song?.name + song?.artists[0]?.name + song?.albumName
                )
        );

        let songNameSimilarity = stringSimilarity(
            requestJson.result.songs[0]?.name +
                requestJson.result.songs[0]?.artists[0]?.name +
                requestJson.result.songs[0]?.album?.name,
            song?.name + song?.artists[0]?.name + song?.albumName
        );

        if (!requestJson.result.songs[0]) {
            console.error("Song is undefined");
            return new Response(
                JSON.stringify({ dynamicLyrics: false, lyrics: song.lyrics }),
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        const lyricsRequest = await fetch(
            `https://openapi.music.163.com/api/song/lyric?id=${requestJson.result.songs[0].id}&lv=-1`
        );

        const lyricsJson = (await lyricsRequest.json()) as OpenApiMusicLyrics;

        const parsedLyrics = parseLyrics(lyricsJson.lrc.lyric);

        if (songNameSimilarity) {
            if (songNameSimilarity > 75) {
                console.log("Adding dynamicLyrics to database");
                db.prepare(
                    `UPDATE song SET dynamicLyrics = ? WHERE id = ?`
                ).run(JSON.stringify(parsedLyrics), id);
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

        if (parsedLyrics && parsedLyrics.length > 0) {
            return new Response(
                JSON.stringify({ dynamicLyrics: true, lyrics: parsedLyrics }),
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
