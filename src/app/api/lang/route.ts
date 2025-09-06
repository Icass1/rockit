import { NextResponse } from "next/server";

import { readFile } from "fs/promises";
import { getSession } from "@/lib/auth/getSession";

export async function GET(request: Request) {
    const session = await getSession();

    const searchParams = new URL(request.url).searchParams;

    const requestLang = searchParams.get("lang");

    let lang: string;

    if (!session?.user) {
        if (requestLang) {
            lang = requestLang;
        } else {
            const fileBuffer = await readFile(`src/lang/en.json`, "utf-8");

            return NextResponse.json(
                { lang: "en", langFile: JSON.parse(fileBuffer) },
                { status: 401 }
            );
        }
    } else {
        lang = "us";
    }

    const fileBuffer = await readFile(`src/lang/${lang}.json`, "utf-8");

    return NextResponse.json({ lang: lang, langFile: JSON.parse(fileBuffer) });
}
