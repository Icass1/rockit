import { db } from "@/db/db";
import type { APIContext } from "astro";

export async function POST(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("User is not logged in", { status: 401 });
    }
    const data = await context.request.json();

    db.prepare("UPDATE user SET lang = ? WHERE id = ?").run(
        data.lang,
        context.locals.user.id
    );

    return new Response("OK", { status: 200 });
}
