import {
    ArtistPageResponseSchema,
    OkResponseSchema,
    type ArtistPageResponse,
} from "@/dto";
import { BACKEND_URL, BaseHttp, IApiFetchOptions } from "@rockit/shared";

export class Http extends BaseHttp {
    private static _lyricsContextRequests = new Map<
        string,
        ReturnType<typeof BaseHttp.getLyricsCorrectionContextAsync>
    >();

    static override getLyricsCorrectionContextAsync(
        publicId: string,
        provider?: string
    ): ReturnType<typeof BaseHttp.getLyricsCorrectionContextAsync> {
        const key = JSON.stringify([publicId, provider]);
        const pending = this._lyricsContextRequests.get(key);
        if (pending) return pending;

        const request = super
            .getLyricsCorrectionContextAsync(publicId, provider)
            .finally(() => {
                this._lyricsContextRequests.delete(key);
            });
        this._lyricsContextRequests.set(key, request);
        return request;
    }

    static async uploadProfileImage(file: File): Promise<boolean> {
        const body = new FormData();
        body.append("file", file);
        const response = await this.baseApiFetchAsync("/user/image", {
            method: "POST",
            body,
        });
        if (!response.ok) return false;
        return OkResponseSchema.safeParse(await response.json()).success;
    }

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

            return fetch(
                `${process.env.BACKEND_INTERNAL_URL || BACKEND_URL}${path}`,
                {
                    signal,
                    method,
                    headers: requestHeaders,
                    body,
                    cache: "no-store",
                }
            );
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
