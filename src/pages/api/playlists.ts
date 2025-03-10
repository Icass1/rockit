import { db } from "@/lib/db/db";
import { parsePlaylist, type RawPlaylistDB } from "@/lib/db/playlist";
import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
    let playlists;
    try {
        playlists = context.url.searchParams
            .get("playlists")
            ?.split(",")
            .map((playlistID) =>
                parsePlaylist(
                    db
                        .prepare(
                            `SELECT ${
                                context.url.searchParams.get("q") || "*"
                            } FROM playlist WHERE id = ?`
                        )
                        .get(playlistID) as RawPlaylistDB
                )
            );
    } catch (err) {
        return new Response(err?.toString(), { status: 404 });
    }

    if (!playlists) {
        return new Response("playlist not found", { status: 404 });
    }

    return new Response(JSON.stringify(playlists), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
