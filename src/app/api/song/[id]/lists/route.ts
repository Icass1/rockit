import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getSession } from "@/lib/auth/getSession";
import { parseUser, RawUserDB, UserDB } from "@/lib/db/user";
import { parsePlaylist, PlaylistDB, RawPlaylistDB } from "@/lib/db/playlist";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params; // Get the dynamic "id" from the URL

    const session = await getSession();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    const user = parseUser(
        db
            .prepare("SELECT lists FROM user WHERE id = ?")
            .get(session.user.id) as RawUserDB
    ) as UserDB<"lists">;

    const userLists = user.lists;

    const out = userLists.map((list) => {
        if (list.type != "playlist") return;

        const playlist = parsePlaylist(
            db
                .prepare("SELECT songs,image,name FROM playlist WHERE id = ?")
                .get(list.id) as RawPlaylistDB
        ) as PlaylistDB<"songs" | "image" | "name">;

        return {
            ...list,
            image: playlist.image,
            name: playlist.name,
            containSong:
                typeof playlist.songs.find((song) => song.id == id) !=
                "undefined",
        };
    });

    return NextResponse.json(out.filter((list) => list));
}
