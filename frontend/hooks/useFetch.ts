import apiFetch from "@/lib/utils/apiFetch";
import { useState, useEffect } from "react";
import { z, ZodType } from "zod";

async function update<T extends ZodType>(
    path: string,
    schema: T,
    setData: React.Dispatch<React.SetStateAction<z.infer<T> | undefined>>
) {
    const res = await apiFetch(path);

    if (res && res.ok) {
        const json = await res.json();
        const parsed = schema.parse(json);
        setData(parsed);
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
