import { useEffect, useState } from "react";
import { UserResponse } from "@/dto/rockItUserResponse";
import apiFetch from "@/lib/utils/apiFetch";

type Session =
    | { status: "authenticated"; user: UserResponse }
    | { status: "loading"; user: null }
    | { status: "unauthenticated"; user: null };

async function update(setData: React.Dispatch<React.SetStateAction<Session>>) {
    const res = await apiFetch("/user/session");

    if (res && res.ok) {
        const json = await res.json();
        const parsed = UserResponse.parse(json);
        setData({ user: parsed, status: "authenticated" });
    } else {
        setData({ user: null, status: "unauthenticated" });
    }
}

export default function useSession(): Session {
    const [data, setData] = useState<Session>({
        status: "loading",
        user: null,
    });

    useEffect(() => {
        update(setData);
    }, []);

    return data;
}
