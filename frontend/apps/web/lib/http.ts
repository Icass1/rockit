import {
    BACKEND_URL,
    BaseHttp,
    HttpResult,
    IApiFetchOptions,
} from "@rockit/shared";
import {
    Recommendations,
    RecommendationsSchema,
} from "@/models/types/recommendations";

export class Http extends BaseHttp {
    static async getRecommendationsAsync(
        externalUsername: string,
        currentPublicId?: string,
        signal?: AbortSignal
    ): Promise<HttpResult<Recommendations>> {
        const controller = new AbortController();
        const cancel = (): void => controller.abort();
        const deadline = setTimeout(cancel, 8000);
        if (signal?.aborted) cancel();
        signal?.addEventListener("abort", cancel, { once: true });
        try {
            const response = await this.baseApiFetchAsync("/recommendations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ externalUsername, currentPublicId }),
                signal: controller.signal,
            });
            if (!response.ok)
                return new HttpResult({
                    ok: false,
                    code: response.status,
                    message: "Recommendations unavailable",
                    detail: "Recommendations unavailable",
                });
            return new HttpResult({
                ok: true,
                code: response.status,
                message: "OK",
                result: RecommendationsSchema.parse(await response.json()),
            });
        } catch {
            return new HttpResult({
                ok: false,
                code: 0,
                message: "Recommendations unavailable",
                detail: "Recommendations unavailable",
            });
        } finally {
            clearTimeout(deadline);
            signal?.removeEventListener("abort", cancel);
        }
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
