import { UserResponse } from "@/dto/rockItUserResponse";

export async function getUserInClient() {
    const res = await fetch("http://localhost:8000/user/session", {
        credentials: "include",
    });

    const json = await res.json();
    const parsed = UserResponse.parse(json);

    return parsed;
}
