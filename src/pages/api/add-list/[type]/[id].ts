import {
    db,
    parseAlbum,
    parsePlaylist,
    parseUser,
    type RawAlbumDB,
    type RawPlaylistDB,
    type RawUserDB,
    type UserDB,
    type UserDBLists,
    type UserDBPinnedLists,
} from "@/lib/db";

import type { APIContext } from "astro";

export async function ALL(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }

    const user = parseUser(
        db
            .prepare("SELECT lists FROM user WHERE id = ?")
            .get(context.locals.user.id) as RawUserDB
    ) as UserDB<"lists">;

    const lists = user.lists;
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

    if (!id) {
        return new Response("Invalid ID");
    }

    if (lists.map((list) => list.id).includes(id)) {
        return new Response("List already in user library");
    }

    db.prepare(`UPDATE user SET lists = ? WHERE id = ?`).run(
        JSON.stringify([
            ...user?.lists,
            {
                createdAt: new Date().getTime(),
                type: type,
                id: id,
            } as UserDBLists,
        ]),
        context.locals.user.id
    );

    console.log(lists, type, id);

    return new Response("OK");
}
