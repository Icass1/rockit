import { useEffect, useState } from "react";
import { SessionResponseSchema } from "@/dto";
import { User } from "@/lib/rockit/user";
import apiFetch from "@/lib/utils/apiFetch";

type Session =
    | { status: "authenticated"; user: User }
    | { status: "loading"; user: null }
    | { status: "unauthenticated"; user: null };

async function update(setData: React.Dispatch<React.SetStateAction<Session>>) {
    const res = await apiFetch("/user/session");

    if (res && res.ok) {
        const json = await res.json();
        const parsed = SessionResponseSchema.parse(json);
        setData({ user: User.fromResponse(parsed), status: "authenticated" });
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
