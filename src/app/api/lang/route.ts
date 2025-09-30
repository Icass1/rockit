import { NextResponse } from "next/server";
import { readFile } from "fs/promises";

export async function GET() {
    const fileBuffer = await readFile("src/lang/en.json", "utf-8");
    return NextResponse.json({ lang: "en", langFile: JSON.parse(fileBuffer) });
}
