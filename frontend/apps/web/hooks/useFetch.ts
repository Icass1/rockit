import { useEffect, useState } from "react";
import { z } from "zod";
import { apiFetch } from "@/lib/utils/apiFetch";

type ZodSchema<T> = {
    parse: (data: unknown) => T;
};

async function update<T>(
    path: string,
    schema: ZodSchema<T>,
    setData: React.Dispatch<React.SetStateAction<T | undefined>>
) {
    try {
        const res = await apiFetch<T>(path, schema as z.ZodSchema<T>);
        setData(res);
    } catch {
        setData(undefined);
    }
}

export default function useFetch<T>(
    path: string,
    schema: ZodSchema<T>
): [T | undefined, () => void] {
    const [data, setData] = useState<T | undefined>(undefined);

    useEffect(() => {
        update(path, schema as z.ZodSchema<T>, setData);
    }, [path, schema]);

    return [data, () => update(path, schema as z.ZodSchema<T>, setData)];
}
