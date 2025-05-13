import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db/db";
import { parseUser, RawUserDB } from "@/lib/db/user";
import { getDateYYYYMMDD } from "@/lib/getTime";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getSession();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    const lastPlayedSong = parseUser(
        db
            .prepare("SELECT lastPlayedSong FROM user WHERE id = ?")
            .get(session.user.id) as RawUserDB
    )?.lastPlayedSong;

    if (!lastPlayedSong) {
        return new NextResponse("lastPlayedSong is undefined", { status: 500 });
    }

    let firstDate: number | undefined = undefined;

    Object.values(lastPlayedSong).forEach((values) => {
        values.forEach((value) => {
            if (
                firstDate === undefined ||
                firstDate > new Date(value).getTime()
            ) {
                firstDate = new Date(value).getTime();
            }
        });
    });

    if (!firstDate) {
        return new NextResponse("First date is undefined", { status: 404 });
    }

    return NextResponse.json(getDateYYYYMMDD(firstDate));
}
