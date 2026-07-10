"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import type { BaseSongWithAlbumResponse } from "@/dto";
import { motion, useScroll, useTransform } from "framer-motion";
import { rockIt } from "@/lib/rockit/rockIt";
import DockedQuickAccessBar from "@/components/Home/DockedQuickAccessBar";
import HeroBackgroundDrift from "@/components/Home/HeroBackgroundDrift";
import QuickAccessCard from "@/components/Home/QuickAccessCard";

interface HeroSlot {
    eyebrow: string;
    title: string;
    subtitle: string;
    song: BaseSongWithAlbumResponse;
    queue: BaseSongWithAlbumResponse[];
}

interface HomeHeroProps {
    greetingName: string;
    ambientSongs: BaseSongWithAlbumResponse[];
    slots: HeroSlot[];
    streak?: number;
    minutesThisWeek?: number;
}

export default function HomeHero({
    greetingName,
    ambientSongs,
    slots,
    streak,
    minutesThisWeek,
}: HomeHeroProps): JSX.Element {
    const sectionRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const [heroVisible, setHeroVisible] = useState(true);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    useEffect(() => {
        const sentinel = sentinelRef.current;
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

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start start", "end start"],
    });

    const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.8], [1, 0.92]);

    if (slots.length === 0) {
        return <DockedQuickAccessBar visible={false} items={[]} />;
    }

    return (
        <>
            <motion.section
                ref={sectionRef}
                style={{ opacity: heroOpacity, scale: heroScale }}
                className="relative flex min-h-[90vh] flex-col overflow-hidden px-6 pt-20 pb-8 md:px-12 md:py-8"
            >
                <HeroBackgroundDrift songs={ambientSongs} maxParticles={10} />

                <div className="relative z-10 mb-8 md:mb-12">
                    <h1 className="text-4xl leading-tight font-bold text-white sm:text-5xl md:text-6xl">
                        {greetingName}
                    </h1>
                    {(streak ?? 0) > 0 || (minutesThisWeek ?? 0) > 0 ? (
                        <div className="mt-3 flex items-center gap-4 text-sm text-white/60">
                            {typeof streak === "number" && streak > 0 && (
                                <span>🔥 {streak} {$vocabulary.HOME_STREAK_DAYS}</span>
                            )}
                            {typeof minutesThisWeek === "number" &&
                                minutesThisWeek > 0 && (
                                    <span>
                                        {Math.round(minutesThisWeek)} {$vocabulary.HOME_MINUTES_THIS_WEEK}
                                    </span>
                                )}
                        </div>
                    ) : null}
                </div>

                <div className="relative z-10 grid flex-1 grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
                    {slots.map((slot) => (
                        <QuickAccessCard
                            key={slot.song.publicId}
                            eyebrow={slot.eyebrow}
                            title={slot.title}
                            subtitle={slot.subtitle}
                            song={slot.song}
                            queue={slot.queue}
                        />
                    ))}
                </div>

                <div className="relative z-10 mt-auto flex justify-center pt-8">
                    <motion.div
                        animate={{ y: [0, 6, 0] }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                        className="h-8 w-5 rounded-full border border-white/30"
                    >
                        <div className="mx-auto mt-2 h-2 w-1 rounded-full bg-white/50" />
                    </motion.div>
                </div>

                {/* Sentinel in normal flow at the bottom of the hero */}
                <div
                    ref={sentinelRef}
                    className="h-px w-full"
                    aria-hidden="true"
                />
            </motion.section>

            <DockedQuickAccessBar
                visible={!heroVisible}
                items={slots.map((s) => ({
                    song: s.song,
                    queue: s.queue,
                    label: s.eyebrow,
                }))}
            />
        </>
    );
}
