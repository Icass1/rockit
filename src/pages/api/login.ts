// import { lucia } from "@/auth";
import { verify } from "@node-rs/argon2";
import { db } from "@/lib/db/db";
import type { UserDB } from "@/lib/db/user";
import { ENV } from "@/rockitEnv";
import type { APIContext } from "astro";

const BACKEND_URL = ENV.BACKEND_URL;

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

    console.log("fetching ", `${BACKEND_URL}/auth/login`);
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        body: JSON.stringify({ username: username, password: password }),
        signal: AbortSignal.timeout(2000),
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (response.status == 401) {
        return new Response(
            JSON.stringify({
                error: "Invalid credentials",
            }),
            {
                status: 401,
            }
        );
    }

    console.log(response.ok);

    if (!response.ok) {
        return new Response(
            JSON.stringify({
                error: "Internal server error",
            }),
            {
                status: 500,
            }
        );
    }

    const responseData = await response.json();

    console.log("responseData", responseData);

    context.cookies.set("auth_session2", responseData.session_id, {
        httpOnly: true,
        path: "/",
        expires: new Date(new Date().getTime() + 1000 * 60 * 60 * 30),
    });

    return new Response();
}
