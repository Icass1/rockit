"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import DockedQuickAccessBar from "@/components/Home/DockedQuickAccessBar";
import HomeHeroCoverflow, {
    type CoverflowCard,
} from "@/components/Home/HomeHeroCoverflow";
import HomeSkeleton from "@/components/Home/HomeSkeleton";
import { useGreeting } from "@/components/Home/hooks/useGreeting";
import { useHomeData } from "@/components/Home/hooks/useHomeData";
import BentoSection from "@/components/Home/sections/BentoSection";
import QuickSelectionsSection from "@/components/Home/sections/QuickSelectionsSection";

export default function HomeClient(): JSX.Element {
    const data = useHomeData();
    const greeting = useGreeting();
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const $username = useStore(rockIt.userManager.usernameAtom);

    const [ambientColor, setAmbientColor] = useState("#787882");

    const greetingName = $username ? `${greeting}, ${$username}` : greeting;

    // ── Coverflow cards: one per available section ──
    const coverflowCards = useMemo(() => {
        if (!data) return [];
        const cards: CoverflowCard[] = [];

        if (data.songsByTimePlayed.length > 0) {
            cards.push({
                eyebrow: $vocabulary.RECENTLY_PLAYED,
                song: data.songsByTimePlayed[0],
                queue: data.songsByTimePlayed,
            });
        }
        if (data.monthlyTop.length > 0) {
            cards.push({
                eyebrow: $vocabulary.MOST_LISTENED,
                song: data.monthlyTop[0],
                queue: data.monthlyTop,
            });
        }
        if (data.hiddenGems.length > 0) {
            cards.push({
                eyebrow: $vocabulary.HIDDEN_GEMS,
                song: data.hiddenGems[0],
                queue: data.hiddenGems,
            });
        }
        if (data.nostalgicMix.length > 0) {
            cards.push({
                eyebrow: $vocabulary.RECENT_MIX,
                song: data.nostalgicMix[0],
                queue: data.nostalgicMix,
            });
        }
        if (data.randomSongsLastMonth.length > 0) {
            cards.push({
                eyebrow: $vocabulary.YOUR_MIX,
                song: data.randomSongsLastMonth[0],
                queue: data.randomSongsLastMonth,
            });
        }

        return cards;
    }, [data, $vocabulary]);

    // ── Docked bar: show when hero scrolls out and a card is playing ──
    const [heroVisible, setHeroVisible] = useState(true);
    const heroSentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sentinel = heroSentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setHeroVisible(entry.isIntersecting);
            },
            { threshold: 0 }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, []);

    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);

    const playingCoverflowCard = useMemo(() => {
        if (!$currentMedia || !$playing) return null;
        return (
            coverflowCards.find(
                (c) => c.song.publicId === $currentMedia.publicId
            ) ?? null
        );
    }, [$currentMedia, $playing, coverflowCards]);

    if (!data) return <HomeSkeleton />;

    return (
        <div className="flex flex-col">
            {/* Ambient glow — covers Hero + Quick Selections */}
            <div className="relative -mt-24 pt-24">
                <div
                    className="home-ambient-glow pointer-events-none absolute inset-0 -z-10"
                    style={
                        { "--cf-accent": ambientColor } as React.CSSProperties
                    }
                    aria-hidden="true"
                />

                {/* Hero: 3D coverflow */}
                {coverflowCards.length > 0 && (
                    <HomeHeroCoverflow
                        greetingName={greetingName}
                        cards={coverflowCards}
                        streak={data.currentStreak}
                        minutesThisWeek={data.minutesListenedThisWeek}
                        onColorChange={setAmbientColor}
                    />
                )}

                {/* Hero sentinel — marks where the hero ends for the docked bar */}
                <div
                    ref={heroSentinelRef}
                    className="h-px w-full"
                    aria-hidden="true"
                />

                {/* Docked bar — appears when hero is off-screen and a card is playing */}
                <DockedQuickAccessBar
                    visible={!heroVisible && playingCoverflowCard !== null}
                    items={
                        playingCoverflowCard
                            ? [
                                  {
                                      song: playingCoverflowCard.song,
                                      queue: playingCoverflowCard.queue,
                                      label: playingCoverflowCard.eyebrow,
                                  },
                              ]
                            : []
                    }
                />

                {/* Quick selections grid */}
                {data.randomSongsLastMonth.length > 0 && (
                    <QuickSelectionsSection
                        title={$vocabulary.QUICK_SELECTIONS}
                        songs={data.randomSongsLastMonth}
                    />
                )}
            </div>

            {/* Bento sections — each section gets its own grid layout */}
            {data.songsByTimePlayed.length > 0 && (
                <BentoSection
                    title={$vocabulary.RECENTLY_PLAYED}
                    songs={data.songsByTimePlayed}
                />
            )}

            {data.hiddenGems.length > 0 && (
                <BentoSection
                    title={$vocabulary.HIDDEN_GEMS}
                    songs={data.hiddenGems}
                />
            )}

            {data.communityTop.length > 0 && (
                <BentoSection
                    title={$vocabulary.COMMUNITY_TOP}
                    songs={data.communityTop}
                />
            )}

            {data.monthlyTop.length > 0 && (
                <BentoSection
                    title={$vocabulary.MOST_LISTENED}
                    songs={data.monthlyTop}
                />
            )}

            {data.moodSongs.length > 0 && (
                <BentoSection
                    title={$vocabulary.MOOD_SONGS}
                    songs={data.moodSongs}
                />
            )}

            {data.nostalgicMix.length > 0 && (
                <BentoSection
                    title={$vocabulary.RECENT_MIX}
                    songs={data.nostalgicMix}
                />
            )}
        </div>
    );
}
