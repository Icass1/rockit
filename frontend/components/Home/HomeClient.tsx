"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { HomeStatsResponse } from "@/dto";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHomeData } from "@/components/Home/hooks/useHomeData";
import QuickSelectionsSection from "@/components/Home/sections/QuickSelectionsSection";
import SongScrollSection from "@/components/Home/sections/SongScrollSection";
import SongsCarousel from "@/components/Home/SongsCarousel";
import Spinner from "@/components/Spinner";

const MONTH_KEYS = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
] as const;

function getPreviousMonthKey() {
    return MONTH_KEYS[(new Date().getMonth() + 11) % 12];
}

function useOnClient<T>(fn: () => T, initialValue: T): T {
    return useSyncExternalStore(
        () => () => {},
        fn,
        () => initialValue
    );
}

interface HomeClientProps {
    initialStats?: HomeStatsResponse | null;
}

export default function HomeClient({ initialStats }: HomeClientProps) {
    const { langFile: lang } = useLanguage();
    const data = useHomeData(initialStats);
    const router = useRouter();
    const previousMonthKey = useOnClient(getPreviousMonthKey, null);

    useEffect(() => {
        if (data?.isEmpty) router.push("/search");
    }, [data?.isEmpty, router]);

    if (!data) {
        return (
            <div className="flex h-screen flex-row items-center justify-center gap-2 text-xl font-semibold">
                <Spinner />
                <span>Loading...</span>
            </div>
        );
    }

    if (!lang) return null;

    if (!previousMonthKey) {
        return (
            <div className="flex h-screen flex-row items-center justify-center gap-2 text-xl font-semibold">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="relative flex h-full flex-col webkit-scroll pt-24 pb-24">
            <SongsCarousel />

            <QuickSelectionsSection
                title={lang.quick_selections}
                songs={data.randomSongsLastMonth}
            />

            <SongScrollSection
                title={lang.recent_played}
                songs={data.songsByTimePlayed}
                className="py-5"
            />

            <SongScrollSection
                title={lang.hiddengems}
                songs={data.hiddenGems}
            />

            <SongScrollSection
                title={lang.communitytop}
                songs={data.communityTop}
                className="py-5"
            />

            <SongScrollSection
                title={`${lang[previousMonthKey as keyof typeof lang]} Recap`}
                songs={data.monthlyTop}
            />
        </div>
    );
}
