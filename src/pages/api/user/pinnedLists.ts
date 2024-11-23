import {
    db,
    parseAlbum,
    parsePlaylist,
    parseUser,
    type RawAlbumDB,
    type RawPlaylistDB,
    type RawUserDB,
    type UserDB,
    type UserDBPinnedLists,
} from "@/lib/db";
import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }
    const DBPinnedLists = (
        parseUser(
            db
                .prepare("SELECT pinnedLists FROM user WHERE id = ?")
                .get(context.locals.user.id) as RawUserDB
        ) as UserDB<"pinnedLists">
    ).pinnedLists;

    const getList = (list: UserDBPinnedLists) => {
        if (list.type == "album") {
            return parseAlbum(
                db
                    .prepare("SELECT id,images,name FROM album WHERE id = ?")
                    .get(list.id) as RawAlbumDB
            );
        } else if (list.type == "playlist") {
            return parsePlaylist(
                db
                    .prepare("SELECT id,images,name FROM playlist WHERE id = ?")
                    .get(list.id) as RawPlaylistDB
            );
        }
    };

    const pinnedLists = DBPinnedLists.map((list) => {
        return { ...getList(list), type: list.type };
    });

    return new Response(JSON.stringify(pinnedLists), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
