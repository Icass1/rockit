import { ArtistPageResponseSchema, type ArtistPageResponse } from "@/dto";
import { BACKEND_URL, BaseHttp, IApiFetchOptions } from "@rockit/shared";

export class Http extends BaseHttp {
    static async getArtistPage(
        path: string
    ): Promise<ArtistPageResponse | undefined> {
        const response = await this.baseApiFetchAsync(path);
        if (!response.ok) return undefined;
        const parsed = ArtistPageResponseSchema.safeParse(
            await response.json()
        );
        return parsed.success ? parsed.data : undefined;
    }

    protected static override async baseApiFetchAsync(
        path: string,
        options: IApiFetchOptions = {}
    ): Promise<Response> {
        const { method = "GET", headers, body, signal } = options;

        if (!path.startsWith("/")) {
            console.warn(`'${path}' doesn't start with /`);
        }

        if (typeof window === "undefined") {
            const { cookies } = await import("next/headers");
            const cookieStore = await cookies();
            const session = cookieStore.get("session_id")?.value;

            const existingHeaders =
                typeof headers === "object" && !Array.isArray(headers)
                    ? (headers as Record<string, string>)
                    : {};

            const requestHeaders: Record<string, string> = {
                ...existingHeaders,
                ...(session ? { Cookie: `session_id=${session}` } : {}),
            };

            return fetch(`${BACKEND_URL}${path}`, {
                method,
                headers: requestHeaders,
                body,
                cache: "no-store",
            });
        }

        return fetch(`${BACKEND_URL}${path}`, {
            method,
            headers,
            body,
            credentials: "include",
            signal,
        });
    }
}
