import { getSession } from "@/lib/auth/getSession";
import { ENV } from "@/rockitEnv";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const session = await getSession();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    let response;

    const url = new URL(request.url);

    if (!url.searchParams.get("url")) {
        return new NextResponse("Missing url", { status: 400 });
    }

    // http://localhost:8000/start-download?user=asdf&url=https://open.spotify.com/intl-es/track/3Ngl8Fn5UtCl2K7UD7EF9e?si=d8da24f36a2c4def
    try {
        response = await fetch(
            `${ENV.BACKEND_URL}/start-download?user=${session.user.id}&url=${url.searchParams.get("url")}`,
            {
                signal: AbortSignal.timeout(2000),
            }
        );
    } catch {
        return new NextResponse("Error connecting to backend", { status: 500 });
    }

    return response;
}
