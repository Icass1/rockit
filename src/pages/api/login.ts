import { lucia } from "@/auth";
import { verify } from "@node-rs/argon2";
import { db, type UserDB } from "@/lib/db";

import type { APIContext } from "astro";

export async function POST(context: APIContext): Promise<Response> {
    const formData = await context.request.formData();
    const username = formData.get("username");

    if (
        typeof username !== "string" ||
        username.length < 3 ||
        username.length > 31 ||
        !/^[a-z0-9A-Z_-]+$/.test(username)
    ) {
        return new Response(JSON.stringify({ error: "Invalid username" }), {
            status: 400,
        });
    }
    const password = formData.get("password");
    if (
        typeof password !== "string" ||
        password.length < 6 ||
        password.length > 255
    ) {
        return new Response(JSON.stringify({ error: "Invalid password" }), {
            status: 400,
        });
    }

    const existingUser = db
        .prepare("SELECT * FROM user WHERE username = ?")
        .get(username) as UserDB | undefined;
    if (!existingUser) {
        return new Response(
            JSON.stringify({
                error: "Incorrect username or password (User doesn't exist)",
            }),
            {
                status: 400,
            }
        );
    }

    const validPassword = await verify(existingUser.passwordHash, password, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
    });
    if (!validPassword) {
        return new Response(
            JSON.stringify({
                error: "Incorrect username or password",
            }),
            {
                status: 400,
            }
        );
    }

    const session = await lucia.createSession(existingUser.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    context.cookies.set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
    );

    return new Response();
}
