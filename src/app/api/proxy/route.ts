import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
    const url = new URL(request.url);

    if (!url.searchParams.get("url")) {
        return new NextResponse("Missing url", { status: 400 });
    }

    const response = await fetch(url.searchParams.get("url") as string);

    if (response.ok) {
        const blob = await response.blob();
        return new NextResponse(blob, { headers: response.headers });
    }

    return new NextResponse("OK");
}
