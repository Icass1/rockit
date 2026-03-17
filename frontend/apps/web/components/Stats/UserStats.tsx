"use client";

import dynamic from "next/dynamic";
import { Clock, Flame, Music2, TrendingUp } from "lucide-react";
import AlbumGrid from "@/components/Stats/charts/AlbumGrid";
import ListeningHeatmap from "@/components/Stats/charts/ListeningHeatmap";
import RankingList from "@/components/Stats/charts/RankingList";
import {
    MOCK_HEATMAP,
    MOCK_MINUTES,
    MOCK_SUMMARY,
    MOCK_TOP_ALBUMS,
    MOCK_TOP_ARTISTS,
    MOCK_TOP_SONGS,
} from "@/components/Stats/mockStatsData";

const MinutesBarChart = dynamic(
    () => import("@/components/Stats/charts/MinutesBarChart"),
    {
        ssr: false,
        loading: () => <div className="skeleton h-55 w-full rounded-xl" />,
    }
);

interface SummaryCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    accent?: boolean;
}

function SummaryCard({ icon, label, value, accent }: SummaryCardProps) {
    return (
        <div
            className={[
                "flex flex-col gap-2 rounded-xl p-3 md:p-4",
                accent
                    ? "border border-[#ee1086]/20 bg-linear-to-br from-[#ee1086]/20 to-[#fb6467]/10"
                    : "border border-neutral-800/50 bg-neutral-900",
            ].join(" ")}
        >
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase md:text-xs">
                    {label}
                </span>
                <span
                    className={accent ? "text-[#ee1086]" : "text-neutral-600"}
                >
                    {icon}
                </span>
            </div>
            <span className="text-xl font-bold text-white tabular-nums md:text-2xl">
                {value}
            </span>
        </div>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-neutral-800/50 bg-neutral-900/60 p-4">
            <h3 className="mb-4 text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                {title}
            </h3>
            {children}
        </div>
    );
}

export default function UserStats({}: {
    range: "7d" | "30d" | "1y" | "custom";
    customStart?: string;
    customEnd?: string;
}) {
    const s = MOCK_SUMMARY;

    // TODO: When backend is ready, use useFetch with the range params:
    // const [data] = useFetch(`/stats/user?range=${range}&start=${customStart}&end=${customEnd}`, StatsSchema);

    return (
        <div className="flex flex-col gap-3 md:gap-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <SummaryCard
                    icon={<Music2 className="h-4 w-4" />}
                    label="Songs played"
                    value={s.songsListened.toLocaleString()}
                    accent
                />
                <SummaryCard
                    icon={<Clock className="h-4 w-4" />}
                    label="Minutes listened"
                    value={s.minutesListened.toLocaleString()}
                />
                <SummaryCard
                    icon={<TrendingUp className="h-4 w-4" />}
                    label="Avg min / song"
                    value={s.avgMinutesPerSong.toFixed(2)}
                />
                <SummaryCard
                    icon={<Flame className="h-4 w-4" />}
                    label="Day streak"
                    value={`${s.currentStreak}d`}
                />
            </div>

            {/* Minutes listened chart */}
            <Section title="Minutes listened — last 8 days">
                <MinutesBarChart data={MOCK_MINUTES} />
            </Section>

            {/* Top songs + Top artists side by side on desktop */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Section title="Top songs">
                    <RankingList
                        items={MOCK_TOP_SONGS}
                        showImages
                        maxItems={10}
                    />
                </Section>
                <Section title="Top artists">
                    <RankingList
                        items={MOCK_TOP_ARTISTS}
                        showImages
                        valueLabel="%"
                        maxItems={8}
                    />
                </Section>
            </div>

            {/* Top albums with covers */}
            <Section title="Top albums">
                <AlbumGrid albums={MOCK_TOP_ALBUMS} />
            </Section>

            {/* Listening heatmap */}
            <Section title="Listening heatmap — by hour & day">
                <ListeningHeatmap data={MOCK_HEATMAP} />
                <p className="mt-3 text-[10px] text-neutral-600">
                    Darker cells = more minutes listened at that hour
                </p>
            </Section>
        </div>
    );
}
