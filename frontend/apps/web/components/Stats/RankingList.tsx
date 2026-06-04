"use client";

import { JSX, useMemo } from "react";
import type { StatsRankedItemResponse } from "@/dto";
import Link from "next/link";

interface RankingListProps {
    items: StatsRankedItemResponse[];
    showImages?: boolean;
    valueLabel?: string;
    maxItems?: number;
}

export default function RankingList({
    items,
    showImages = false,
    valueLabel = "",
    maxItems,
}: RankingListProps): JSX.Element {
    const displayItems = useMemo(() => {
        const sorted = [...items].sort((a, b) => b.value - a.value);
        return maxItems ? sorted.slice(0, maxItems) : sorted;
    }, [items, maxItems]);

    const maxValue = displayItems[0]?.value || 1;

    if (displayItems.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-neutral-600">
                No data available
            </p>
        );
    }

    return (
        <div className="flex flex-col">
            {displayItems.map((item, index) => (
                <RankingRow
                    key={item.publicId}
                    item={item}
                    index={index}
                    maxValue={maxValue}
                    showImages={showImages}
                    valueLabel={valueLabel}
                />
            ))}
        </div>
    );
}

function RankingRow({
    item,
    index,
    maxValue,
    showImages,
    valueLabel,
}: {
    item: StatsRankedItemResponse;
    index: number;
    maxValue: number;
    showImages: boolean;
    valueLabel: string;
}): JSX.Element {
    const progressPercent = (item.value / maxValue) * 100;
    const rowContent = (
        <>
            <span className="w-6 shrink-0 text-right text-sm font-medium tabular-nums text-neutral-600 md:text-base">
                {index + 1}
            </span>

            {showImages && item.imageUrl && (
                <img
                    src={item.imageUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded object-cover md:h-12 md:w-12"
                    aria-hidden
                />
            )}

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white md:text-base">
                    {item.name}
                </p>
                {item.subtitle && (
                    <p className="truncate text-xs text-neutral-500 md:text-sm">
                        {item.subtitle}
                    </p>
                )}
            </div>

            <div className="hidden h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-neutral-800 md:block lg:w-28">
                <div
                    className="h-full rounded-full bg-[#ee1086] transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums text-neutral-500 md:text-base">
                {item.value}
                {valueLabel}
            </span>
        </>
    );

    const className =
        "group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.03] md:gap-4 md:py-3";

    if (item.href) {
        return (
            <Link href={item.href} className={className}>
                {rowContent}
            </Link>
        );
    }

    return <div className={className}>{rowContent}</div>;
}
