import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db/db";
import type { PlaylistDBSong } from "@/lib/db/playlist";
import { parseSong, type RawSongDB, type SongDB } from "@/lib/db/song";
import { parseUser, type RawUserDB, type UserDB } from "@/lib/db/user";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    const { id } = await params;

    const session = await getSession();

    if (!session?.user) {
        return new NextResponse("Unauthenticated", { status: 401 });
    }

    const user = parseUser(
        db
            .prepare("SELECT likedSongs FROM user WHERE id = ?")
            .get(session.user.id) as RawUserDB
    ) as UserDB<"likedSongs">;

    if (!user) {
        return new NextResponse(
            "Interal server error. User is not in database but is logged in",
            { status: 500 }
        );
    }

    const song = parseSong(
        db.prepare("SELECT id FROM song WHERE id = ?").get(id) as RawSongDB
    ) as SongDB<"id">;

    if (!song || !id) {
        return new NextResponse("Song not found", { status: 404 });
    }

    if (user.likedSongs.find((song) => song.id == id)) {
        return new NextResponse("Song already in liked list", { status: 400 });
    }

    db.prepare(`UPDATE user SET likedSongs = ? WHERE id = ?`).run(
        JSON.stringify([
            ...user?.likedSongs,
            {
                added_at: new Date().toISOString().split(".")[0] + "Z",
                id: id,
            } as PlaylistDBSong,
        ]),
        session.user.id
    );

    return new NextResponse("OK");
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    const { id } = await params;

    const session = await getSession();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    const user = parseUser(
        db
            .prepare("SELECT likedSongs FROM user WHERE id = ?")
            .get(session.user.id) as RawUserDB
    ) as UserDB<"likedSongs">;

    if (!user) {
        return new NextResponse(
            "Interal server error. User is not in database but is logged in",
            { status: 500 }
        );
    }

    if (!user.likedSongs.find((song) => song.id == id)) {
        return new NextResponse("Song not in liked list", { status: 400 });
    }

    db.prepare(`UPDATE user SET likedSongs = ? WHERE id = ?`).run(
        JSON.stringify([
            ...user?.likedSongs.filter((likedSong) => likedSong.id != id),
        ]),
        session.user.id
    );

    return new NextResponse("OK");
}
