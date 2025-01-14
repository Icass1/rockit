import type { APIContext } from "astro";

const RADIO_BROWSER_URL = "https://de1.api.radio-browser.info/json";

// https://de1.api.radio-browser.info/
// http://de1.api.radio-browser.info/json/stations/byname/jazz
// https://de1.api.radio-browser.info/json/stations?limit=10
// https://streaming.radiomargherita.com/stream/radiomargherita

export async function GET(context: APIContext): Promise<Response> {
    const searchTerm = context.params.searchTerm;
    const by = context.params.by;

    if (!searchTerm) {
        return new Response("Tag parameter is required", { status: 400 });
    }

    try {
        const url = new URL(
            `${RADIO_BROWSER_URL}/stations/${by}/${searchTerm}`
        );
        const params = context.url.searchParams;

        params.forEach((value, key) => {
            url.searchParams.append(key, value);
        });

        console.log(url.toString());
        const response = await fetch(url.toString(), {
            headers: {
                "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(10000), // Tiempo máximo de espera
        });

        if (!response.ok) {
            return new Response("Failed to fetch radio stations", {
                status: response.status,
            });
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(
            `Error fetching data from radio API (${error?.toString()})`,
            {
                status: 500,
            }
        );
    }
}
