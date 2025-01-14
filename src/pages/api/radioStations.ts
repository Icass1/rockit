import { ENV } from "@/rockitEnv";
import type { APIContext } from "astro";
const BACKEND_URL = ENV.BACKEND_URL;

const RADIO_BROWSER_URL = "https://www.radio-browser.info/webservice/json";

export async function GET(context: APIContext): Promise<Response> {
    const { searchParams } = context.url;
    const tag = searchParams.get("tag");

    if (!tag) {
        return new Response("Tag parameter is required", { status: 400 });
    }

    try {
        const response = await fetch(`${RADIO_BROWSER_URL}/stations/bytag/${tag}`, {
            headers: {
                "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(5000), // Tiempo máximo de espera
        });

        if (!response.ok) {
            return new Response("Failed to fetch radio stations", { status: response.status });
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response("Error fetching data from radio API", { status: 500 });
    }
}