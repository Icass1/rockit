// app>api>auth>register>route.ts

import { db } from "@/lib/db/db";
import { generateId } from "@/lib/generateId";
import { hash } from "@node-rs/argon2";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const { username, password, repeatPassword } = await request.json();

    if (
        typeof username !== "string" ||
        username.length < 3 ||
        username.length > 31 ||
        !/^[a-z0-9A-Z_-]+$/.test(username)
    ) {
        return NextResponse.json(
            {
                error: "Invalid username",
            },
            {
                status: 400,
            }
        );
    }
    if (
        typeof password !== "string" ||
        password.length < 6 ||
        password.length > 255
    ) {
        return NextResponse.json(
            {
                error: "Invalid password",
            },
            {
                status: 400,
            }
        );
    }

    console.log("app>api>auth>register>route.ts", {
        username,
        password,
        repeatPassword,
    });

    const passwordHash = await hash(password, {
        // recommended minimum parameters
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
    });
    const userId = generateId(16);

    const existingUser = db
        .prepare("SELECT id FROM user WHERE username = ? COLLATE NOCASE")
        .all(username);

    if (existingUser.length > 0) {
        return NextResponse.json(
            {
                error: "Username not available",
            },
            { status: 500 }
        );
    }

    try {
        db.prepare(
            "INSERT INTO user (id, username, passwordHash, updatedAt, createdAt) VALUES(?, ?, ?, ?, ?)"
        ).run(
            userId,
            username,
            passwordHash,
            new Date().getTime(),
            new Date().getTime()
        );
    } catch (error) {
        return NextResponse.json(
            {
                error: "An unknown error occurred" + error?.toString(),
            },
            { status: 500 }
        );
    }

    return NextResponse.json({ message: "success" });
}
