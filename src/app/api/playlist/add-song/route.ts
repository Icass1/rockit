import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db/db";
import {
    parsePlaylist,
    PlaylistDB,
    PlaylistDBSong,
    RawPlaylistDB,
} from "@/lib/db/playlist";
import { parseSong, RawSongDB, SongDB } from "@/lib/db/song";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
    const session = await getSession();

    if (!session?.user.id) {
        return new NextResponse("Unauthenticated", { status: 401 });
    }

    const data = (await request.json()) as {
        playlistId?: string;
        songId?: string;
    };

    if (!data.playlistId)
        return new NextResponse("playlistId required", { status: 400 });
    if (!data.songId)
        return new NextResponse("songId required", { status: 400 });

    const playlistDb = parsePlaylist(
        db
            .prepare("SELECT songs FROM playlist WHERE id = ?")
            .get(data.playlistId) as RawPlaylistDB
    ) as PlaylistDB<"songs">;

    const songDb = parseSong(
        db
            .prepare("SELECT id FROM song WHERE id = ?")
            .get(data.songId) as RawSongDB
    ) as SongDB<"id">;

    if (!playlistDb) {
        return new NextResponse("Playlist not found", { status: 400 });
    }

    if (!songDb) {
        return new NextResponse("Song not found", { status: 400 });
    }

    if (playlistDb.songs.find((song) => song.id == data.songId)) {
        return new NextResponse("Song already in playlist", { status: 400 });
    }

    db.prepare("UPDATE playlist SET songs = ? WHERE id = ?").run(
        JSON.stringify([
            ...playlistDb.songs,
            {
                id: data.songId,
                addedInRockit: true,
                added_at: new Date().toUTCString(),
            } as PlaylistDBSong,
        ]),
        data.playlistId
    );

    return new NextResponse("OK");
}
