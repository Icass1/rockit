// app>api>auth>register>route.ts

import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();
        // YOU MAY WANT TO ADD SOME VALIDATION HERE

        console.log("app>api>auth>register>route.ts", { username, password });
    } catch (e) {
        console.log("app>api>auth>register>route.ts", { e });
    }

    return NextResponse.json({ message: "success" });
}
