import { NextResponse } from "next/server";

import { readFile } from "fs/promises";

export async function GET() {
    console.warn("Lang should be saved in database and fetched to backend");
    const fileBuffer = await readFile(`src/lang/en.json`, "utf-8");

    return NextResponse.json({ lang: "en", langFile: JSON.parse(fileBuffer) });
}
