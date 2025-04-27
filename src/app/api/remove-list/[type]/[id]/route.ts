import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db/db";
import { parseUser, type RawUserDB, type UserDB } from "@/lib/db/user";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    {
        params,
    }: {
        params: Promise<{ id: string; type: string }>;
    }
): Promise<NextResponse> {
    console.log(params);
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

    // Validar si el ID existe en las listas del usuario
    const listToRemove = lists.find(
        (list) => list.type === type && list.id === id
    );

    if (!listToRemove) {
        return new NextResponse("List not found in user library", {
            status: 404,
        });
    }

    // Filtrar para eliminar la lista especificada
    const updatedLists = lists.filter(
        (list) => !(list.type === type && list.id === id)
    );

    // Actualizar en la base de datos
    db.prepare(`UPDATE user SET lists = ? WHERE id = ?`).run(
        JSON.stringify(updatedLists),
        session.user.id
    );

    return NextResponse.json({ sucess: true }, { status: 200 });
}
