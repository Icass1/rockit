import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db/db";
import { parseUser, RawUserDB } from "@/lib/db/user";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const session = await getSession();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    const searchParams = new URL(request.url).searchParams;

    let user;
    try {
        user = parseUser(
            db
                .prepare(
                    `SELECT ${
                        searchParams.get("q") || "*"
                    } FROM user WHERE id = ?`
                )
                .get(session.user.id) as RawUserDB
        );
    } catch (err) {
        return new Response(err?.toString(), { status: 404 });
    }

    // @ts-expect-error Delete passwordHash
    delete user?.passwordHash;

    return NextResponse.json(user);
}
