import { getSession } from "@/lib/auth/getSession";
import { parseAlbum, RawAlbumDB } from "@/lib/db/album";
import { db } from "@/lib/db/db";
import { parsePlaylist, RawPlaylistDB } from "@/lib/db/playlist";
import {
    parseUser,
    UserDBList,
    type RawUserDB,
    type UserDB,
} from "@/lib/db/user";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    {
        params,
    }: {
        params: Promise<{ id: string; type: string }>;
    }
): Promise<NextResponse> {
    const { id, type } = await params; // Get the dynamic "id" from the URL

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

    const lists = user.lists;

    let list;

    if (type == "album") {
        list = parseAlbum(
            db
                .prepare("SELECT id,images,name FROM album WHERE id = ?")
                .get(id) as RawAlbumDB
        );
    } else if (type == "playlist") {
        list = parsePlaylist(
            db
                .prepare("SELECT id,images,name FROM playlist WHERE id = ?")
                .get(id) as RawPlaylistDB
        );
    }

    if (!list) {
        return new NextResponse("List not found", { status: 404 });
    }

    if (!id) {
        return new NextResponse("Invalid ID", { status: 400 });
    }

    if (lists.map((list) => list.id).includes(id)) {
        return new NextResponse("List already in user library", {
            status: 400,
        });
    }

    db.prepare(`UPDATE user SET lists = ? WHERE id = ?`).run(
        JSON.stringify([
            ...user?.lists,
            {
                createdAt: new Date().getTime(),
                type: type,
                id: id,
            } as UserDBList,
        ]),
        session.user.id
    );

    return NextResponse.json({ ...list, type: type });
}
