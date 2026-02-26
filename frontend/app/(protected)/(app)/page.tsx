import { HomeStatsResponseSchema } from "@/dto";
import HomeClient from "@/components/Home/HomeClient";

async function getHomeStats() {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(`${baseUrl}/stats/home`, {
        next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return HomeStatsResponseSchema.parse(await res.json());
}

export default async function HomePage() {
    const stats = await getHomeStats();
    return <HomeClient initialStats={stats} />;
}
