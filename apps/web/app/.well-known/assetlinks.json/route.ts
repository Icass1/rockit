import { androidAssociation } from "@/config/androidAssociation.mjs";

export const dynamic = "force-dynamic";
export function GET(): Response {
    try {
        return Response.json(
            androidAssociation(
                process.env.ROCKIT_ANDROID_PACKAGE_ID,
                process.env.ROCKIT_ANDROID_CERT_SHA256
            ),
            { headers: { "Cache-Control": "public, max-age=300" } }
        );
    } catch {
        return Response.json([], {
            status: 503,
            headers: { "Cache-Control": "no-store" },
        });
    }
}
