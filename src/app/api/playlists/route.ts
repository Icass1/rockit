import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { parsePlaylist, RawPlaylistDB } from "@/lib/db/playlist";

export async function GET(request: NextRequest) {
    const searchParams = new URL(request.url).searchParams;

    let playlists;
    try {
        playlists = searchParams
            .get("playlists")
            ?.split(",")
            .map((playlistID) =>
                parsePlaylist(
                    db
                        .prepare(
                            `SELECT ${
                                searchParams.get("q") || "*"
                            } FROM playlist WHERE id = ?`
                        )
                        .get(playlistID) as RawPlaylistDB
                )
            );
    } catch (err) {
        return new NextResponse(err?.toString(), { status: 404 });
    }

    if (!playlists) {
        return new NextResponse("playlist not found", { status: 404 });
    }

    return NextResponse.json(playlists);
}
