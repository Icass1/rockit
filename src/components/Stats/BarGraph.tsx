"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Item {
    name: string;
    href: string;
    value: number;
    id: string;
    index: number;
}

export default function BarGraph({
    items: propItems,
    name,
    type = "percentage",
}: {
    items: Item[];
    name: string;
    type?: "percentage" | "value";
}) {
    const [localItems, setLocalItems] =
        useState<Array<Item & { isExiting?: boolean; isEntering?: boolean }>>(
            propItems
        );
    const totalValue = localItems.reduce((sum, item) => sum + item.value, 0);
    const maxValue = Math.max(...localItems.map((item) => item.value));

    console.log(propItems);

    useEffect(() => {
        const prevItems = localItems;
        const nextItems = propItems;

        // Identify exiting and entering items
        const exitingItems = prevItems.filter(
            (prevItem) =>
                !nextItems.some((nextItem) => nextItem.id === prevItem.id)
        );
        const enteringItems = nextItems.filter(
            (nextItem) =>
                !prevItems.some((prevItem) => prevItem.id === nextItem.id)
        );

        // Prepare new local items with flags
        const newLocalItems = [
            ...nextItems.map((item) => ({
                ...item,
                isEntering: enteringItems.some((e) => e.id === item.id),
            })),
            ...exitingItems.map((item) => ({
                ...item,
                isExiting: true,
            })),
        ];

        setLocalItems(newLocalItems);

        // Clear entering flags after a short delay
        const enteringTimeout = setTimeout(() => {
            setLocalItems((current) =>
                current.map((item) => ({ ...item, isEntering: false }))
            );
        }, 50);

        // Remove exiting items after animation
        const exitingTimeout = setTimeout(() => {
            setLocalItems((current) =>
                current.filter((item) => !item.isExiting)
            );
        }, 1000);

        return () => {
            clearTimeout(enteringTimeout);
            clearTimeout(exitingTimeout);
        };
    }, [propItems, localItems]);

    return (
        <div className="h-[450px] overflow-hidden rounded-lg bg-neutral-800 p-2 md:w-96">
            <label className="text-lg font-semibold">{name}</label>

            <div className="relative w-full">
                {/* Sort localItems by id to maintain stable DOM order */}
                {localItems
                    .sort((a, b) => a.id.localeCompare(b.id)) // Stable sort by id
                    .map((item) => {
                        let top: number;
                        if (item.isEntering) {
                            top = 450; // Start below container
                        } else if (item.isExiting) {
                            top = 450; // Exit below container
                        } else {
                            top = item.index < 20 ? item.index * 20 : 21 * 20;
                        }

                        return (
                            <div
                                key={item.id} // Key remains stable based on id
                                id={`${item.id}-${item.index}`}
                                className="absolute grid w-full grid-cols-[1fr_1fr] justify-between gap-2 px-7 transition-[top] duration-1000 md:px-4"
                                style={{ top: `${top}px` }}
                            >
                                {/* Rest of the component remains unchanged */}
                                <Link
                                    href={item.href}
                                    className="truncate md:hover:underline"
                                >
                                    {item.name}
                                </Link>
                                <div className="relative ml-auto flex w-full max-w-full min-w-0 flex-row items-center">
                                    <div
                                        className="block h-1 rounded bg-gradient-to-r from-[#ee1086] to-[#fb6467] transition-[width] duration-1000"
                                        style={{
                                            width: `calc(${(item.value / maxValue) * 100}%)`,
                                        }}
                                    />
                                    <label
                                        className="flex px-1 text-left text-xs font-semibold transition-[left] duration-1000"
                                        style={{
                                            left: `min(calc(${(item.value / maxValue) * 100}% + 4px)`,
                                        }}
                                    >
                                        {type === "percentage"
                                            ? `${Math.round((item.value / totalValue) * 100)}%`
                                            : item.value}
                                    </label>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}
