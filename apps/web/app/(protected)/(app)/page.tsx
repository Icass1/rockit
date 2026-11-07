import { Suspense, type JSX } from "react";
import { redirect } from "next/navigation";
import { ServerHttp } from "@/lib/api/server";
import { getUserInServer } from "@/lib/getUserInServer";
import { requireResult } from "@/lib/server/resources";
import { buildHomeData } from "@/lib/services/homeData";
import HomeClient from "@/components/Home/HomeClient";
import HomeDiscovery from "@/components/Home/HomeDiscovery";

export default async function HomePage(): Promise<JSX.Element> {
    const [session, statsResponse, recommendations] = await Promise.all([
        getUserInServer(),
        ServerHttp.getHomeStats(),
        ServerHttp.getRecommendationsForYou(20, false),
    ]);
    if (!session) redirect("/login");
    const stats = requireResult(statsResponse);
    const data = buildHomeData(
        stats,
        recommendations.isOk() ? recommendations.result : undefined
    );
    return (
        <>
            <HomeClient
                data={data}
                username={session === "offline" ? "" : session.username}
                initialHour={new Date().getUTCHours()}
                discovery={
                    <Suspense fallback={null}>
                        <HomeDiscovery />
                    </Suspense>
                }
            />
        </>
    );
}
