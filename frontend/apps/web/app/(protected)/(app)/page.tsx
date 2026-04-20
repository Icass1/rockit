import { cookies } from "next/headers";
import { HomeStatsResponseSchema } from "@/dto";
import { BACKEND_URL } from "@/environment";
import HomeClient from "@/components/Home/HomeClient";

async function getHomeStats() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    const headers: Record<string, string> = {};
    if (sessionId) {
        headers.Cookie = `session_id=${sessionId}`;
    }

    const res = await fetch(`${BACKEND_URL}/stats/home`, {
        headers,
        next: { revalidate: 60 },
    });

    if (!res.ok) return null;
    return HomeStatsResponseSchema.parse(await res.json());
}

export default async function HomePage() {
    const stats = await getHomeStats();
    return <HomeClient initialStats={stats} />;
}
