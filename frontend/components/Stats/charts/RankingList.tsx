"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { RankedItem } from "@/components/Stats/mockStatsData";

interface AnimatedItem extends RankedItem {
    displayIndex: number;
    isEntering?: boolean;
    isExiting?: boolean;
}

export default function RankingList({
    items,
    showImages = true,
    valueLabel = "",
    maxItems = 10,
}: {
    items: RankedItem[];
    showImages?: boolean;
    valueLabel?: string;
    maxItems?: number;
}) {
    const visible = useMemo(() => items.slice(0, maxItems), [items, maxItems]);

    const [animated, setAnimated] = useState<AnimatedItem[]>(() =>
        visible.map((item, i) => ({ ...item, displayIndex: i }))
    );

    const prevRef = useRef(animated);

    useEffect(() => {
        const prev = prevRef.current;
        const next = visible;

        const exiting = prev.filter((p) => !next.some((n) => n.id === p.id));
        const entering = next.filter((n) => !prev.some((p) => p.id === n.id));

        if (!exiting.length && !entering.length) {
            requestAnimationFrame(() => {
                setAnimated(
                    next.map((item, i) => ({ ...item, displayIndex: i }))
                );
                prevRef.current = next.map((item, i) => ({
                    ...item,
                    displayIndex: i,
                }));
            });
            return;
        }

        const merged: AnimatedItem[] = [
            ...next.map((item, i) => ({
                ...item,
                displayIndex: i,
                isEntering: entering.some((e) => e.id === item.id),
            })),
            ...exiting.map((item) => ({
                ...item,
                displayIndex: maxItems,
                isExiting: true,
            })),
        ];

        setAnimated(merged);

        const t1 = setTimeout(() => {
            setAnimated((cur) => cur.map((i) => ({ ...i, isEntering: false })));
        }, 30);
        const t2 = setTimeout(() => {
            setAnimated((cur) => cur.filter((i) => !i.isExiting));
            prevRef.current = next.map((item, i) => ({
                ...item,
                displayIndex: i,
            }));
        }, 700);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [visible, maxItems]);

    const maxValue = Math.max(...animated.map((i) => i.value), 1);
    const totalValue = animated
        .filter((i) => !i.isExiting)
        .reduce((s, i) => s + i.value, 0);

    const ROW_H = 44;
    const containerH = Math.min(animated.length, maxItems) * ROW_H;

    return (
        <div
            className="relative w-full transition-[height] duration-500"
            style={{ height: containerH }}
        >
            {[...animated]
                .sort((a, b) => a.id.localeCompare(b.id))
                .map((item, _, arr) => {
                    const top = item.isEntering
                        ? containerH + 40
                        : item.isExiting
                          ? containerH + 40
                          : item.displayIndex * ROW_H;

                    const pct = (item.value / maxValue) * 100;
                    const share = totalValue
                        ? Math.round((item.value / totalValue) * 100)
                        : 0;

                    const rank =
                        arr
                            .filter((i) => !i.isExiting)
                            .sort((a, b) => b.value - a.value)
                            .findIndex((i) => i.id === item.id) + 1;

                    return (
                        <div
                            key={item.id}
                            className="absolute flex w-full items-center gap-2.5 pr-1 transition-[top,opacity] duration-700"
                            style={{
                                top,
                                height: ROW_H - 4,
                                opacity:
                                    item.isEntering || item.isExiting ? 0 : 1,
                            }}
                        >
                            <span className="w-5 shrink-0 text-right text-xs font-bold text-neutral-600 tabular-nums">
                                {rank}
                            </span>

                            {showImages && (
                                <div className="h-8 w-8 shrink-0 overflow-hidden rounded">
                                    {item.imageUrl ? (
                                        <Image
                                            src={item.imageUrl}
                                            alt={item.name}
                                            width={32}
                                            height={32}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-full w-full rounded bg-neutral-700" />
                                    )}
                                </div>
                            )}

                            <Link
                                href={item.href}
                                className="min-w-0 flex-1 truncate text-sm font-medium text-white transition-colors hover:text-[#ee1086]"
                            >
                                {item.name}
                            </Link>

                            <div className="flex w-2/5 shrink-0 items-center gap-2">
                                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
                                    <div
                                        className="absolute h-full rounded-full bg-linear-to-r from-[#ee1086] to-[#fb6467] transition-[width] duration-700"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="w-8 shrink-0 text-right text-xs font-bold text-neutral-400 tabular-nums">
                                    {valueLabel === "%"
                                        ? `${share}%`
                                        : item.value}
                                </span>
                            </div>
                        </div>
                    );
                })}
        </div>
    );
}
