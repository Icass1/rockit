import {
    db,
    parseUser,
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
    );

    if (!user) {
        return new Response("Interal server error. User is not in database but is logged in", { status: 500 });
    }
    db.prepare(`UPDATE user SET pinnedLists = ? WHERE id = ?`).run(
        JSON.stringify([
            ...user?.pinnedLists,
            {
                createdAt: new Date().getTime(),
                type: context.params.type,
                id: context.params.id,
            } as UserDBPinnedLists,
        ]),
        context.locals.user.id
    );

    console.log(context.params.type);
    console.log(context.params.id);

    return new Response("OK");
}
