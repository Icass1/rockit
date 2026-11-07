"use client";

import { JSX, useMemo, useState } from "react";
import Link from "next/link";
import type { StatsRankedItemResponse } from "@/dto";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

interface RankingListProps {
    items: StatsRankedItemResponse[];
    showImages?: boolean;
    valueLabel?: string;
    initialVisible?: number;
    onPlay?: (item: StatsRankedItemResponse) => void;
    formatValue?: (value: number) => string;
}

const RANK_COLORS = [
    "text-warning-foreground",
    "text-foreground",
    "text-warning",
];

export default function RankingList({
    items,
    showImages = false,
    valueLabel = "",
    initialVisible = 5,
    onPlay,
    formatValue,
}: RankingListProps): JSX.Element {
    const vocabulary = useVocabulary();

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
                <p className="text-disabled-foreground text-sm">
                    {vocabulary.MOBILE_NO_DATA}
                </p>
            </div>
        );
    }

    return (
        <div className="divide-foreground-strong/4 max-w-full divide-y overflow-hidden md:overflow-visible">
            {displayItems.map((item, index) => (
                <RankingRow
                    key={item.publicId}
                    item={item}
                    index={index}
                    maxValue={maxValue}
                    showImages={showImages}
                    valueLabel={valueLabel}
                    onPlay={onPlay}
                    formatValue={formatValue}
                />
            ))}
            <div className="flex justify-center gap-4">
                {canShowLess && (
                    <button
                        type="button"
                        onClick={handleShowLess}
                        className="text-subtle-foreground hover:text-foreground-strong flex cursor-pointer items-center gap-1.5 py-3 text-sm font-medium transition-colors"
                    >
                        <ChevronUp className="h-4 w-4" />
                        {vocabulary.STATS_SHOW_LESS}
                    </button>
                )}
                {hasMore && (
                    <button
                        type="button"
                        onClick={handleShowMore}
                        className="text-subtle-foreground hover:text-foreground-strong flex cursor-pointer items-center gap-1.5 py-3 text-sm font-medium transition-colors"
                    >
                        <ChevronDown className="h-4 w-4" />
                        {vocabulary.STATS_SHOW_MORE}
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
    formatValue,
}: {
    item: StatsRankedItemResponse;
    index: number;
    maxValue: number;
    showImages: boolean;
    valueLabel: string;
    onPlay?: (item: StatsRankedItemResponse) => void;
    formatValue?: (value: number) => string;
}): JSX.Element {
    const progressPercent = (item.value / maxValue) * 100;
    const isTop3 = index < 3;

    const content = (
        <div className="flex items-center gap-3 py-1 md:gap-4 md:py-1.5">
            <span
                className={`w-6 shrink-0 text-center text-sm leading-none font-bold tabular-nums md:w-8 md:text-base ${
                    isTop3 ? RANK_COLORS[index] : "text-disabled-foreground"
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
                        <div className="bg-muted h-full w-full" />
                    )}
                </div>
            )}

            <div className="min-w-0 flex-1">
                <p className="text-foreground-strong truncate text-sm font-medium md:text-base">
                    {item.name}
                </p>
                {item.subtitle && (
                    <p className="text-subtle-foreground mt-0.5 truncate text-xs md:text-sm">
                        {item.subtitle}
                    </p>
                )}
            </div>

            <div className="flex shrink-0 items-center gap-2 md:gap-3">
                <div className="bg-muted hidden h-1 w-16 overflow-hidden rounded-full md:block lg:w-24">
                    <div
                        className="from-primary to-brand-light h-full rounded-full bg-linear-to-r transition-all duration-700 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                <span className="text-muted-foreground text-right text-sm font-medium tabular-nums md:w-5 md:text-base">
                    {formatValue ? formatValue(item.value) : item.value}
                    {valueLabel}
                </span>
            </div>
        </div>
    );

    const className =
        "group w-full text-left transition-all duration-200 hover:bg-foreground-strong/2";

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
