import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";

import { readFile } from "fs/promises";
import { getSession } from "@/lib/auth/getSession";
import { UserDB } from "@/lib/db/user";

export async function GET(request: Request) {
    const session = await getSession();

    const searchParams = new URL(request.url).searchParams;

    const requestLang = searchParams.get("lang");

    let lang: string;

    if (!session?.user) {
        if (requestLang) {
            lang = requestLang;
        } else {
            return new Response("Unauthenticated", { status: 401 });
        }
    } else {
        lang = (
            db
                .prepare("SELECT lang FROM user WHERE id = ?")
                .get(session.user.id) as UserDB<"lang">
        ).lang;
    }

    const fileBuffer = await readFile(`src/lang/${lang}.json`, "utf-8");

    return NextResponse.json({ lang: lang, langFile: JSON.parse(fileBuffer) });
}
