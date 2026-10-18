import { Http } from "@/lib/http";

export async function getUserInClient() {
    const session = await Http.getSession();

    if (session.isNotOk()) {
        console.warn(
            "Failed to fetch user session:",
            session.code,
            session.message
        );
        return undefined;
    }

    return session.result;
}
