import { db } from "@/lib/db/db";
import { type UserDB } from "@/lib/db/user";
import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("User is not logged in", { status: 401 });
    }

    let user;
    try {
        user = (await db
            .prepare(
                `SELECT ${
                    context.url.searchParams.get("q") || "*"
                } FROM user WHERE id = ?`
            )
            .get(context.locals.user.id)) as UserDB;
    } catch (err) {
        return new Response(err?.toString(), { status: 404 });
    }

    // @ts-ignore
    delete user?.passwordHash;

    return new Response(JSON.stringify(user), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
