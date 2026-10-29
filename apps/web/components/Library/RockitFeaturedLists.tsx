"use client";

import type { JSX } from "react";
import Link from "next/link";
import { useStore } from "@nanostores/react";
import { CalendarDays, Disc3, Heart, History } from "lucide-react";
import type { RockitListKey } from "@/models/types/navigationPins";
import { rockIt } from "@/lib/rockit/rockIt";
import { getRockitListName } from "@/lib/utils/navigationPins";
import NavigationPinMenu from "@/components/Navigation/NavigationPinMenu";

/** Rockit's dynamic personal lists: right-click, long press or Shift+F10 to anchor. */
export default function RockitFeaturedLists(): JSX.Element {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const keys: RockitListKey[] = [
        "liked",
        "most-listened",
        "recent-mix",
        "year-recap",
        "last-month",
    ];
    const previousMonth = new Date();
    previousMonth.setDate(1);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const month = previousMonth
        .toLocaleDateString("en", { month: "long" })
        .toLowerCase();
    const year = new Date().getFullYear() - 1;
    return (
        <>
            {keys.map((key) => {
                const name = getRockitListName(key, vocabulary);
                const image =
                    key === "last-month"
                        ? `/recap-covers/${month}.png`
                        : "/rockit-background.png";
                const Icon =
                    key === "liked"
                        ? Heart
                        : key === "most-listened"
                          ? Disc3
                          : key === "recent-mix"
                            ? History
                            : CalendarDays;
                return (
                    <NavigationPinMenu
                        key={key}
                        publicId={key}
                        title={name}
                        cover={image}
                        className="w-40 shrink-0"
                    >
                        <Link
                            href={`/playlist/${key}`}
                            className="block w-40 flex-none rounded-lg transition duration-75 select-none [-webkit-touch-callout:none] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white md:hover:scale-105"
                        >
                            <div
                                className="relative aspect-square w-full rounded-lg bg-cover"
                                style={{ backgroundImage: `url(${image})` }}
                            >
                                {key === "year-recap" ? (
                                    <span className="absolute inset-0 flex items-center justify-center text-3xl font-black tracking-tight text-white">
                                        {year}
                                    </span>
                                ) : (
                                    key !== "last-month" && (
                                        <Icon
                                            className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2"
                                            aria-hidden
                                            fill={
                                                key === "liked"
                                                    ? "white"
                                                    : "none"
                                            }
                                        />
                                    )
                                )}
                            </div>
                            <p className="mt-2 block truncate text-center font-semibold">
                                {name}
                            </p>
                            <p className="block truncate text-center text-sm text-gray-400">
                                {vocabulary.BY} Rock It!
                            </p>
                        </Link>
                    </NavigationPinMenu>
                );
            })}
        </>
    );
}
