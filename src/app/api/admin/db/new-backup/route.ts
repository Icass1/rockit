import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db/db";
import { NextResponse } from "next/server";
import * as fs from "fs";

export async function GET(): Promise<NextResponse> {
    const session = await getSession();

    if (!session?.user?.admin) {
        return new NextResponse("Not found", { status: 404 });
    }

    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const newFileName = `database/back.database.${year}.${month.toString().padStart(2, "0")}.${day.toString().padStart(2, "0")}.db`;

    if (fs.existsSync(newFileName)) {
        return new NextResponse("File already exists", { status: 400 });
    }

    await db.backup(newFileName);

    return new NextResponse("OK");
}
