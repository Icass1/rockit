import { getSession } from "@/lib/auth/getSession";
import { ENV } from "@/rockitEnv";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getSession();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    let response;

    try {
        response = await fetch(
            `${ENV.BACKEND_URL}/downloads?user=${session.user.id}`,
            {
                signal: AbortSignal.timeout(2000),
            }
        );
    } catch {
        return new NextResponse("Error connecting to backend", { status: 500 });
    }

    return response;
}
