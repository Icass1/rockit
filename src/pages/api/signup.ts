import { lucia } from "@/auth";
import { generateId } from "lucia";
import { hash } from "@node-rs/argon2";

import { db } from "@/db/db";

import type { APIContext } from "astro";

export async function POST(context: APIContext): Promise<Response> {
    const formData = await context.request.formData();
    const username = formData.get("username");

    // username must be between 4 ~ 31 characters, and only consists of lowercase letters, 0-9, -, and _
    // keep in mind some database (e.g. mysql) are case insensitive
    if (
        typeof username !== "string" ||
        username.length < 3 ||
        username.length > 31 ||
        !/^[a-z0-9A-Z_-]+$/.test(username)
    ) {
        return new Response(
            JSON.stringify({
                error: "Invalid username",
            }),
            {
                status: 400,
            }
        );
    }
    const password = formData.get("password");
    if (
        typeof password !== "string" ||
        password.length < 6 ||
        password.length > 255
    ) {
        return new Response(
            JSON.stringify({
                error: "Invalid password",
            }),
            {
                status: 400,
            }
        );
    }

    const passwordHash = await hash(password, {
        // recommended minimum parameters
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
    });
    const userId = generateId(16);

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

        // await db.insert(User).values({ id: userId, username: username, passwordHash: passwordHash })
        const session = await lucia.createSession(userId, {});
        const sessionCookie = lucia.createSessionCookie(session.id);
        context.cookies.set(
            sessionCookie.name,
            sessionCookie.value,
            sessionCookie.attributes
        );

        return new Response("OK");
    } catch (error) {
        return new Response(
            JSON.stringify({
                error: "An unknown error occurred" + error?.toString(),
            }),
            {
                status: 500,
            }
        );
    }
}
