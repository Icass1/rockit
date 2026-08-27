import {
    BACKEND_URL,
    BaseHttp,
    DownloadZipRequest,
    DownloadZipRequestSchema,
    HttpResult,
    IApiFetchOptions,
} from "@rockit/packages/shared";

export class Http extends BaseHttp {
    static async downloadZip(
        payload: DownloadZipRequest
    ): Promise<HttpResult<Blob>> {
        const response = await this.baseApiFetchAsync(
            "/downloader/download-zip",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(DownloadZipRequestSchema.parse(payload)),
            }
        );

        if (!response.ok) {
            let detail: string | unknown[] | Record<string, unknown> =
                response.statusText;
            try {
                detail = (await response.json()).detail ?? detail;
            } catch {
                // Keep the HTTP status when the backend did not return JSON.
            }
            return new HttpResult({
                ok: false,
                code: response.status,
                message: response.statusText,
                detail,
            });
        }

        return new HttpResult({
            ok: true,
            code: response.status,
            message: "OK",
            result: await response.blob(),
        });
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
