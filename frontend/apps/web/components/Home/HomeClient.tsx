"use client";

import { useMemo, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import { useHomeData } from "@/components/Home/hooks/useHomeData";
import { useGreeting } from "@/components/Home/hooks/useGreeting";
import HomeHero from "@/components/Home/HomeHero";
import HomeSkeleton from "@/components/Home/HomeSkeleton";
import QuickSelectionsSection from "@/components/Home/sections/QuickSelectionsSection";
import SongScrollSection from "@/components/Home/sections/SongScrollSection";

export default function HomeClient(): JSX.Element {
    const data = useHomeData();
    const greeting = useGreeting();
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const $username = useStore(rockIt.userManager.usernameAtom);

    // No redirect — home is always accessible

    const greetingName = $username
        ? `${greeting}, ${$username}`
        : greeting;

    const heroSlots = useMemo(() => {
        if (!data) return [];
        const slots: Array<{
            eyebrow: string;
            title: string;
            subtitle: string;
            song: import("@/dto").BaseSongWithAlbumResponse;
            queue: import("@/dto").BaseSongWithAlbumResponse[];
        }> = [];

        if (data.songsByTimePlayed.length > 0) {
            slots.push({
                eyebrow: $vocabulary.RECENTLY_PLAYED,
                title: data.songsByTimePlayed[0].name,
                subtitle:
                    data.songsByTimePlayed[0].artists[0]?.name ?? "",
                song: data.songsByTimePlayed[0],
                queue: data.songsByTimePlayed,
            });
        }

        if (data.monthlyTop.length > 0) {
            slots.push({
                eyebrow: $vocabulary.YOUR_MIX,
                title: data.monthlyTop[0].name,
                subtitle: $vocabulary.MOST_LISTENED,
                song: data.monthlyTop[0],
                queue: data.monthlyTop,
            });
        }

        if (data.hiddenGems.length > 0) {
            slots.push({
                eyebrow: $vocabulary.HIDDEN_GEMS,
                title: data.hiddenGems[0].name,
                subtitle:
                    data.hiddenGems[0].artists[0]?.name ?? "",
                song: data.hiddenGems[0],
                queue: data.hiddenGems,
            });
        }

        return slots;
    }, [data, $vocabulary]);

    if (!data) return <HomeSkeleton />;

    return (
        <div className="flex flex-col">
            {heroSlots.length > 0 && (
                <HomeHero
                    greetingName={greetingName}
                    ambientSongs={data.songsByTimePlayed}
                    slots={heroSlots}
                />
            )}

            {data.randomSongsLastMonth.length > 0 && (
                <QuickSelectionsSection
                    title={$vocabulary.QUICK_SELECTIONS}
                    songs={data.randomSongsLastMonth}
                />
            )}

            {data.songsByTimePlayed.length > 0 && (
                <SongScrollSection
                    title={$vocabulary.RECENTLY_PLAYED}
                    songs={data.songsByTimePlayed}
                    className="py-5"
                />
            )}

            {data.hiddenGems.length > 0 && (
                <SongScrollSection
                    title={$vocabulary.HIDDEN_GEMS}
                    songs={data.hiddenGems}
                />
            )}

            {data.communityTop.length > 0 && (
                <SongScrollSection
                    title={$vocabulary.COMMUNITY_TOP}
                    songs={data.communityTop}
                    className="py-5"
                />
            )}

            {data.monthlyTop.length > 0 && (
                <SongScrollSection
                    title={$vocabulary.MOST_LISTENED}
                    songs={data.monthlyTop}
                />
            )}

            {data.moodSongs.length > 0 && (
                <SongScrollSection
                    title={$vocabulary.MOOD_SONGS}
                    songs={data.moodSongs}
                />
            )}

            {data.nostalgicMix.length > 0 && (
                <SongScrollSection
                    title={$vocabulary.RECENT_MIX}
                    songs={data.nostalgicMix}
                />
            )}
        </div>
    );
}
