import {
    ArtistPageResponseSchema,
    DownloadZipRequestSchema,
    type ArtistPageResponse,
    type DownloadZipRequest,
} from "@/dto";
import {
    BACKEND_URL,
    BaseHttp,
    HttpResult,
    IApiFetchOptions,
} from "@rockit/shared";
import { z } from "zod";

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

    static async downloadBinary(
        path: string,
        payload: DownloadZipRequest
    ): Promise<HttpResult<Blob>> {
        const parsed = DownloadZipRequestSchema.safeParse(payload);
        if (!parsed.success) {
            return new HttpResult<Blob>({
                ok: false,
                code: 400,
                message: "Validation Error",
                detail: parsed.error.message,
            });
        }

        try {
            const response = await this.baseApiFetchAsync(path, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsed.data),
            });
            if (!response.ok) {
                const errorSchema = z.object({
                    detail: z.union([
                        z.string(),
                        z.record(z.string(), z.unknown()),
                        z.array(z.unknown()),
                    ]),
                });
                const error = errorSchema.safeParse(
                    await response.json().catch(() => undefined)
                );
                return new HttpResult<Blob>({
                    ok: false,
                    code: response.status,
                    message: response.statusText,
                    detail: error.success ? error.data.detail : "Unknown error",
                });
            }

            return new HttpResult<Blob>({
                ok: true,
                code: response.status,
                message: response.statusText,
                result: await response.blob(),
            });
        } catch (error) {
            return new HttpResult<Blob>({
                ok: false,
                code: 0,
                message: "Network Error",
                detail: error instanceof Error ? error.message : String(error),
            });
        }
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
