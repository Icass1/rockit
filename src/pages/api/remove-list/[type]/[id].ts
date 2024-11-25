import {
    db,
    parseUser,
    type RawUserDB,
    type UserDB,
    type UserDBLists,
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

    // Validar si el ID existe en las listas del usuario
    const listToRemove = lists.find(
        (list) => list.type === type && list.id === id
    );

    if (!listToRemove) {
        return new Response("List not found in user library", { status: 404 });
    }

    // Filtrar para eliminar la lista especificada
    const updatedLists = lists.filter(
        (list) => !(list.type === type && list.id === id)
    );

    // Actualizar en la base de datos
    db.prepare(`UPDATE user SET lists = ? WHERE id = ?`).run(
        JSON.stringify(updatedLists),
        context.locals.user.id
    );

    console.log("Removed list:", listToRemove);

    return new Response(JSON.stringify({ success: true }), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}