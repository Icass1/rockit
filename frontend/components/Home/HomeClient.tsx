"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHomeData } from "@/components/Home/hooks/useHomeData";
import SongsCarousel from "@/components/Home/SongsCarousel";
import SongScrollSection from "@/components/Home/sections/SongScrollSection";
import QuickSelectionsSection from "@/components/Home/sections/QuickSelectionsSection";
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

export default function HomeClient() {
    const { langFile: lang } = useLanguage();
    const data = useHomeData();
    const router = useRouter();

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

    const previousMonthKey = getPreviousMonthKey();

    return (
        <div className="relative flex h-full flex-col overflow-y-auto pb-24 pt-24">
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
                title={`${lang[previousMonthKey]} Recap`}
                songs={data.monthlyTop}
            />
        </div>
    );
}
