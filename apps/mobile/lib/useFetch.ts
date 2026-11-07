import type { HttpResult } from "@rockit/shared";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import type { IUseFetch } from "@/models/interfaces/useFetch";
import { Http } from "@/lib/http";

export default function useFetch<T>(
    load: () => Promise<HttpResult<T>>
): IUseFetch<T> {
    const resource = useAsyncResource(async () => {
        const response = await load.call(Http);
        if (!response.isOk()) throw new Error(response.message);
        return response.result;
    });
    return {
        data: resource.data,
        loading: resource.loading,
        error: resource.error?.message,
        update: resource.refresh,
    };
}
