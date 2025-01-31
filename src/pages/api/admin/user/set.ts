import { lucia } from "@/auth";
import { verify } from "@node-rs/argon2";
import { db, type UserDB } from "@/lib/db";

import type { APIContext } from "astro";

export async function POST(context: APIContext): Promise<Response> {
    return new Response("OK");
}
