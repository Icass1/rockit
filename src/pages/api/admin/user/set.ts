import { lucia } from "@/auth";
import { verify } from "@node-rs/argon2";

import type { APIContext } from "astro";

export async function POST(context: APIContext): Promise<Response> {
    return new Response("OK");
}
