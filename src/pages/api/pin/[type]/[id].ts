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

export async function ALL(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }

    const user = parseUser(
        db
            .prepare("SELECT pinnedLists FROM user WHERE id = ?")
            .get(context.locals.user.id) as RawUserDB
    ) as UserDB<"pinnedLists">;

    const type = context.params.type;
    const id = context.params.id;

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
        return new Response("List not found", { status: 404 });
    }

    if (!user) {
        return new Response(
            "Interal server error. User is not in database but is logged in",
            { status: 500 }
        );
    }

    console.log(
        JSON.stringify([
            ...user?.pinnedLists,
            {
                createdAt: new Date().getTime(),
                type: type,
                id: id,
            } as UserDBPinnedLists,
        ]),
        id
    );
    db.prepare(`UPDATE user SET pinnedLists = ? WHERE id = ?`).run(
        JSON.stringify([
            ...user?.pinnedLists,
            {
                createdAt: new Date().getTime(),
                type: type,
                id: id,
            } as UserDBPinnedLists,
        ]),
        context.locals.user.id
    );

    return new Response(JSON.stringify({ ...list, type: type }), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
