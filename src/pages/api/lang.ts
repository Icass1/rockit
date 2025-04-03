import { db } from "@/lib/db/db";
import type { UserDB } from "@/lib/db/user";
import type { APIContext } from "astro";

import { readFile } from "fs/promises";

export async function GET(context: APIContext): Promise<Response> {
    const requestLang = context.url.searchParams.get("lang");

    console.log(requestLang);
    let lang: string;

    if (!context.locals.user) {
        if (requestLang) {
            lang = requestLang;
        } else {
            return new Response("Unauthenticated", { status: 401 });
        }
    } else {
        lang = (
            db
                .prepare("SELECT lang FROM user WHERE id = ?")
                .get(context.locals.user.id) as UserDB<"lang">
        ).lang;
    }

    const fileBuffer = await readFile(`src/lang/${lang}.json`, "utf-8");

    return new Response(
        JSON.stringify({ lang: lang, langFile: JSON.parse(fileBuffer) }),
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );
}
