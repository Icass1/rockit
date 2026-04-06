import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { IUseFetch } from "@/models/interfaces/useFetch";
import { TZodSchema } from "@/models/types/api";
import { apiFetch } from "@/lib/utils/apiFetch";

async function update<T>(
    path: string,
    schema: TZodSchema<T>,
    setData: Dispatch<SetStateAction<T | undefined>>,
    setLoading: Dispatch<SetStateAction<boolean>>,
    setError: Dispatch<SetStateAction<boolean | undefined>>
) {
    setLoading(true);
    try {
        console.log({ path });
        const res = await apiFetch<T>(path, schema);
        console.log({ res });
        setData(res);
        setError(false);
    } catch (e) {
        console.error(`Error in useFetch.update. ${e}`);
        setData(undefined);
        setError(true);
    } finally {
        setLoading(false);
    }
}

export default function useFetch<T>(
    path: string,
    schema: TZodSchema<T>
): IUseFetch<T> {
    const [data, setData] = useState<T | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<boolean | undefined>(undefined);

    useEffect(() => {
        update(path, schema, setData, setLoading, setError);
    }, [path, schema]);

    return {
        data: data,
        update: () => update(path, schema, setData, setLoading, setError),
        loading,
        error,
    };
}
