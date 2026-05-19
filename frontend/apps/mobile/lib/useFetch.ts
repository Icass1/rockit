import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { HttpResult } from "@rockit/shared";
import { IUseFetch } from "@/models/interfaces/useFetch";
import { Http } from "@/lib/http";

async function update<T>(
    func: () => Promise<HttpResult<T>>,
    setData: Dispatch<SetStateAction<T | undefined>>,
    setLoading: Dispatch<SetStateAction<boolean>>,
    setError: Dispatch<SetStateAction<string | undefined>>
): Promise<void> {
    setLoading(true);
    const response = await func.bind(Http)();
    setLoading(false);

    if (response.isOk()) {
        setData(response.result);
        setError(undefined);
    } else {
        setData(undefined);
        setError(response.message);
    }
}

export default function useFetch<T>(
    func: () => Promise<HttpResult<T>>
): IUseFetch<T> {
    const [data, setData] = useState<T | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | undefined>(undefined);

    console.log("useFetch", func);

    useEffect((): void => {
        update(func, setData, setLoading, setError);
    }, [func]);

    return {
        data: data,
        update: (): Promise<void> =>
            update(func, setData, setLoading, setError),
        loading,
        error,
    };
}
