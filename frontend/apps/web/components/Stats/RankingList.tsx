"use client";

import { JSX, useMemo, useState } from "react";
import Link from "next/link";
import type { StatsRankedItemResponse } from "@/dto";
import { ChevronDown, ChevronUp } from "lucide-react";

interface RankingListProps {
    items: StatsRankedItemResponse[];
    showImages?: boolean;
    valueLabel?: string;
    initialVisible?: number;
    onPlay?: (item: StatsRankedItemResponse) => void;
}

const RANK_COLORS = ["text-amber-300", "text-stone-300", "text-orange-400"];

export default function RankingList({
    items,
    showImages = false,
    valueLabel = "",
    initialVisible = 5,
    onPlay,
}: RankingListProps): JSX.Element {
    const [visibleCount, setVisibleCount] = useState(initialVisible);

    const sorted = useMemo(() => {
        return [...items].sort((a, b) => b.value - a.value);
    }, [items]);

    const displayItems = sorted.slice(0, visibleCount);
    const hasMore = visibleCount < sorted.length;
    const canShowLess = visibleCount > initialVisible;

    const maxValue = displayItems[0]?.value || 1;

    const handleShowMore = (): void => {
        setVisibleCount(sorted.length);
    };

    const handleShowLess = (): void => {
        setVisibleCount(initialVisible);
    };

    if (sorted.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <p className="text-sm text-neutral-600">No data available</p>
            </div>
        );
    }

    return (
        <div className="max-w-full divide-y divide-white/4 overflow-hidden md:overflow-visible">
            {displayItems.map((item, index) => (
                <RankingRow
                    key={item.publicId}
                    item={item}
                    index={index}
                    maxValue={maxValue}
                    showImages={showImages}
                    valueLabel={valueLabel}
                    onPlay={onPlay}
                />
            ))}
            <div className="flex justify-center gap-4">
                {canShowLess && (
                    <button
                        type="button"
                        onClick={handleShowLess}
                        className="flex cursor-pointer items-center gap-1.5 py-3 text-sm font-medium text-neutral-500 transition-colors hover:text-white"
                    >
                        <ChevronUp className="h-4 w-4" />
                        Show less
                    </button>
                )}
                {hasMore && (
                    <button
                        type="button"
                        onClick={handleShowMore}
                        className="flex cursor-pointer items-center gap-1.5 py-3 text-sm font-medium text-neutral-500 transition-colors hover:text-white"
                    >
                        <ChevronDown className="h-4 w-4" />
                        Show more
                    </button>
                )}
            </div>
        </div>
    );
}

function RankingRow({
    item,
    index,
    maxValue,
    showImages,
    valueLabel,
    onPlay,
}: {
    item: StatsRankedItemResponse;
    index: number;
    maxValue: number;
    showImages: boolean;
    valueLabel: string;
    onPlay?: (item: StatsRankedItemResponse) => void;
}): JSX.Element {
    const progressPercent = (item.value / maxValue) * 100;
    const isTop3 = index < 3;

    const content = (
        <div className="flex items-center gap-3 py-1 md:gap-4 md:py-1.5">
            <span
                className={`w-6 shrink-0 text-center text-sm leading-none font-bold tabular-nums md:w-8 md:text-base ${
                    isTop3 ? RANK_COLORS[index] : "text-neutral-600"
                }`}
            >
                {index + 1}
            </span>

            {showImages && (
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded md:h-12 md:w-12">
                    {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={item.imageUrl}
                            alt=""
                            className="h-full w-full object-cover select-none"
                            aria-hidden
                        />
                    ) : (
                        <div className="h-full w-full bg-neutral-800" />
                    )}
                </div>
            )}

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white md:text-base">
                    {item.name}
                </p>
                {item.subtitle && (
                    <p className="mt-0.5 truncate text-xs text-neutral-500 md:text-sm">
                        {item.subtitle}
                    </p>
                )}
            </div>

            <div className="flex shrink-0 items-center gap-2 md:gap-3">
                <div className="hidden h-1 w-16 overflow-hidden rounded-full bg-neutral-800 md:block lg:w-24">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467] transition-all duration-700 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                <span className="text-right text-sm font-medium text-neutral-400 tabular-nums md:w-5 md:text-base">
                    {item.value}
                    {valueLabel}
                </span>
            </div>
        </div>
    );

    const className =
        "group w-full text-left transition-all duration-200 hover:bg-white/2";

    if (onPlay) {
        return (
            <button
                type="button"
                onClick={() => onPlay(item)}
                className={className}
            >
                {content}
            </button>
        );
    }

    if (item.href) {
        return (
            <Link href={item.href} className={className}>
                {content}
            </Link>
        );
    }

    return <div className={className}>{content}</div>;
}
