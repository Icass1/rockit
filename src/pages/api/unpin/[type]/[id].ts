import { db } from "@/lib/db/db";
import { type UserDB } from "@/lib/db/user";
import type { APIContext } from "astro";

export async function ALL(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }

    const user = (await db
        .prepare("SELECT pinnedLists FROM user WHERE id = ?")
        .get(context.locals.user.id)) as UserDB as UserDB<"pinnedLists">;

    const type = context.params.type;
    const id = context.params.id;

    // Comprobar si el elemento que se quiere desanclar existe
    const listToUnpin = user?.pinnedLists?.find(
        (list) => list.type === type && list.id === id
    );

    if (!listToUnpin) {
        return new Response("Item not pinned", { status: 404 });
    }

    // Eliminar el elemento de la lista de pines
    const updatedPinnedLists = user?.pinnedLists.filter(
        (list) => list.type !== type || list.id !== id
    );

    // Actualizar la base de datos
    if (updatedPinnedLists) {
        db.prepare(`UPDATE user SET pinnedLists = ? WHERE id = ?`).run(
            JSON.stringify(updatedPinnedLists),
            context.locals.user.id
        );
    }

    return new Response(JSON.stringify({ success: true }), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
