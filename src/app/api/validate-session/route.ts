import { getSession } from "@/lib/auth/getSession";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
    const session = await getSession();

    return NextResponse.json(session?.user);
}
