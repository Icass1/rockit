import type { APIContext } from "astro";
import { getStats } from "@/lib/stats";

export async function GET(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }

    const start = context.url.searchParams.get("start");
    const end = context.url.searchParams.get("end");

    if (!start || !end) {
        return new Response("Must pass start and end as search params", {
            status: 404,
        });
    }

    const data = await getStats(Number(start), Number(end));

    return new Response(JSON.stringify(data), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
