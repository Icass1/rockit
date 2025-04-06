import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { parseSong, RawSongDB } from "@/lib/db/song";

export async function GET(request: NextRequest) {
    const searchParams = new URL(request.url).searchParams;

    let songs;
    try {
        songs = searchParams
            .get("songs")
            ?.split(",")
            .map((id) =>
                parseSong(
                    db
                        .prepare(
                            `SELECT ${
                                searchParams.get("q") || "*"
                            } FROM song WHERE id = ?`
                        )
                        .get(id) as RawSongDB
                )
            );
    } catch (err) {
        return new Response(err?.toString(), { status: 404 });
    }

    if (!songs) {
        return new Response("Song not found", { status: 404 });
    }

    return NextResponse.json(songs);
}
