import { NextRequest, NextResponse } from "next/server";

const RADIO_BROWSER_URL = "https://de1.api.radio-browser.info/json";

// https://de1.api.radio-browser.info/
// http://de1.api.radio-browser.info/json/stations/byname/jazz
// https://de1.api.radio-browser.info/json/stations?limit=10
// https://streaming.radiomargherita.com/stream/radiomargherita

export async function GET(
    request: NextRequest,
    {
        params,
    }: {
        params: Promise<{ by: string; searchTerm: string }>;
    }
): Promise<NextResponse> {
    const requestUrl = new URL(request.url);

    const { searchTerm, by } = await params;

    if (!searchTerm) {
        return new NextResponse("searchTerm parameter is required", {
            status: 400,
        });
    }

    try {
        const url = new URL(
            `${RADIO_BROWSER_URL}/stations/${by}/${searchTerm}`
        );
        const params = requestUrl.searchParams;

        params.forEach((value, key) => {
            console.log("1", value, key);
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
            return new NextResponse("Failed to fetch radio stations", {
                status: response.status,
            });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return new NextResponse(
            `Error fetching data from radio API (${error?.toString()})`,
            {
                status: 500,
            }
        );
    }
}
