import "server-only";
import { cookies } from "next/headers";
import { BACKEND_URL } from "@rockit/shared/environment";
import { BaseHttp } from "@rockit/shared/http/baseHttp";
import type { IApiFetchOptions } from "@rockit/shared/models/types/api";

/** Request-local authentication; never store cookies or response data on this class. */
export class ServerHttp extends BaseHttp {
    protected static override async baseApiFetchAsync(
        path: string,
        options: IApiFetchOptions = {}
    ): Promise<Response> {
        if (!path.startsWith("/"))
            throw new Error("API paths must start with /");
        const headers = new Headers(options.headers);
        // Never inherit an arbitrary Cookie header from a caller.
        headers.delete("cookie");
        const session = (await cookies()).get("session_id")?.value;
        if (session) headers.set("cookie", `session_id=${session}`);
        return fetch(
            `${process.env.BACKEND_INTERNAL_URL || BACKEND_URL}${path}`,
            {
                method: options.method ?? "GET",
                headers,
                body: options.body,
                signal: options.signal,
                cache: "no-store",
            }
        );
    }
}
