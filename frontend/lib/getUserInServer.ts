import { RockItUserResponse } from "@/responses/rockItUserResponse";
import { cookies } from "next/headers";

export async function getUserInServer() {
    const cookieStore = await cookies();
    const session = cookieStore.get("session_id")?.value;

    console.log("getUserInServer", session)

    const res = await fetch("http://localhost:8000/user/session", {
        headers: {
            Cookie: `session_id=${session}`,
        },
        cache: "no-store",
    });

    const json = await res.json();
    const parsed = RockItUserResponse.parse(json);

    return parsed;
}
