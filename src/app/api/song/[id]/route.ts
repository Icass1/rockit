import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { parseSong, RawSongDB } from "@/lib/db/song";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params; // Get the dynamic "id" from the URL
    const searchParams = new URL(request.url).searchParams;

    let song;
    try {
        song = parseSong(
            db
                .prepare(
                    `SELECT ${
                        searchParams.get("q") || "*"
                    } FROM song WHERE id = ?`
                )
                .get(id) as RawSongDB
        );
    } catch (err) {
        return new Response(err?.toString(), { status: 404 });
    }

    if (!song) {
        return new Response("Song not found", { status: 404 });
    }

    return NextResponse.json({ ...song, inDatabase: true });
}
