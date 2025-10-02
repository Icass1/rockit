import apiFetch from "@/lib/utils/apiFetch";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { z, ZodType } from "zod";

async function update<T extends ZodType>(
    path: string,
    schema: T,
    setData: React.Dispatch<React.SetStateAction<z.infer<T> | undefined>>
) {
    const res = await apiFetch(path);

    if (!res) {
        console.warn("useFetch.update 1 -> /login");
        signOut();
        window.location.pathname = "/login";
        return;
    }

    if (res.ok) {
        const json = await res.json();
        const parsed = schema.parse(json);
        setData(parsed);
    } else if (res.status === 401) {
        console.warn("useFetch.update 2 -> /login");
        signOut();
        window.location.pathname = "/login";
    }
}

export default function useFetch<T extends ZodType>(
    path: string,
    schema: T
): [z.infer<T> | undefined, () => void] {
    const [data, setData] = useState<z.infer<T> | undefined>(undefined);

    useEffect(() => {
        update(path, schema, setData);
    }, [path, schema]);

    return [data, () => update(path, schema, setData)];
}
