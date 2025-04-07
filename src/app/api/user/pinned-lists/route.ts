import { getSession } from "@/lib/auth/getSession";
import { parseAlbum, RawAlbumDB } from "@/lib/db/album";
import { db } from "@/lib/db/db";
import { parsePlaylist, RawPlaylistDB } from "@/lib/db/playlist";
import { parseUser, RawUserDB, UserDB, UserDBPinnedLists } from "@/lib/db/user";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getSession();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    const DBPinnedLists = (
        parseUser(
            db
                .prepare("SELECT pinnedLists FROM user WHERE id = ?")
                .get(session.user.id) as RawUserDB
        ) as UserDB<"pinnedLists">
    ).pinnedLists;

    const getList = (list: UserDBPinnedLists) => {
        if (list.type == "album") {
            return parseAlbum(
                db
                    .prepare("SELECT id,image,name FROM album WHERE id = ?")
                    .get(list.id) as RawAlbumDB
            );
        } else if (list.type == "playlist") {
            return parsePlaylist(
                db
                    .prepare("SELECT id,image,name FROM playlist WHERE id = ?")
                    .get(list.id) as RawPlaylistDB
            );
        }
    };

    const pinnedLists = DBPinnedLists.map((list) => {
        return { ...getList(list), type: list.type };
    });

    return NextResponse.json(pinnedLists);
}
