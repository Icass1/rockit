import { db } from "@/lib/db/db";
import { type UserDB } from "@/lib/db/user";
import type { APIContext } from "astro";

export async function ALL(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }

    const user = (await db
        .prepare("SELECT lists FROM user WHERE id = ?")
        .get(context.locals.user.id)) as UserDB as UserDB<"lists">;

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

    // Filtra para eliminar la lista especificada
    const updatedLists = lists.filter(
        (list) => !(list.type === type && list.id === id)
    );

    // Actualizar en la base de datos
    db.prepare(`UPDATE user SET lists = ? WHERE id = ?`).run(
        JSON.stringify(updatedLists),
        context.locals.user.id
    );

    return new Response(JSON.stringify({ success: true }), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
