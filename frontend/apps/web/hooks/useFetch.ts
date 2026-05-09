import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { HttpResult } from "@rockit/shared";
import { IUseFetch } from "@/models/interfaces/useFetch";

async function update<T>(
    func: () => Promise<HttpResult<T>>,
    setData: Dispatch<SetStateAction<T | undefined>>,
    setLoading: Dispatch<SetStateAction<boolean>>,
    setError: Dispatch<SetStateAction<boolean | undefined>>
) {
    setLoading(true);
    const response = await func();
    setLoading(false);

    if (response.isOk()) {
        setData(response.result);
        setError(false);
    } else {
        setData(undefined);
        setError(true);
    }
}

export default function useFetch<T>(
    func: () => Promise<HttpResult<T>>
): IUseFetch<T> {
    const [data, setData] = useState<T | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<boolean | undefined>(undefined);

    useEffect(() => {
        update(func, setData, setLoading, setError);
    }, [func]);

    return {
        data: data,
        update: () => update(func, setData, setLoading, setError),
        loading,
        error,
    };
}
