"use client";

import { useId, type JSX } from "react";
import Image from "next/image";
import { LockKeyhole } from "lucide-react";
import styles from "@/components/Friends/Friends.module.css";

// Rounded corners and a shared die keep the collection recognisable at 40px.
const medal =
    "M36 4Q40 2 44 4L65 16Q69 18 69 23V49Q69 54 65 56L44 68Q40 70 36 68L15 56Q11 54 11 49V23Q11 18 15 16Z";

export default function RockitEmblem({
    variant,
    earned,
    tier = 1,
}: {
    variant: string;
    earned: boolean;
    tier?: number;
}): JSX.Element {
    const id = useId().replace(/:/g, "");
    const metalId = `${id}-metal`;
    const enamelId = `${id}-enamel`;
    return (
        <span
            className={styles.emblem}
            data-variant={variant}
            data-earned={earned}
            aria-hidden="true"
        >
            <svg viewBox="0 0 80 80" fill="none" focusable="false">
                <defs>
                    <linearGradient
                        id={metalId}
                        x1="15"
                        y1="4"
                        x2="64"
                        y2="68"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="var(--medal-highlight)" />
                        <stop offset="0.28" stopColor="var(--medal-metal)" />
                        <stop
                            offset="0.52"
                            stopColor="var(--medal-highlight)"
                        />
                        <stop offset="1" stopColor="var(--medal-shadow)" />
                    </linearGradient>
                    <linearGradient
                        id={enamelId}
                        x1="24"
                        y1="12"
                        x2="55"
                        y2="62"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="currentColor" stopOpacity="0.36" />
                        <stop
                            offset="1"
                            stopColor="currentColor"
                            stopOpacity="0.07"
                        />
                    </linearGradient>
                </defs>
                <path
                    d={medal}
                    transform="translate(0 3)"
                    fill="var(--medal-shadow)"
                />
                <path d={medal} fill={`url(#${metalId})`} />
                <path
                    d={medal}
                    transform="translate(4.8 4.32) scale(.88)"
                    fill="var(--medal-face)"
                    stroke="var(--medal-shadow)"
                    strokeWidth="0.8"
                />
                <path
                    d={medal}
                    transform="translate(6.4 5.76) scale(.84)"
                    fill={`url(#${enamelId})`}
                    stroke="currentColor"
                    strokeOpacity="0.55"
                    strokeWidth="0.7"
                />
                <g stroke="currentColor" strokeLinecap="round">
                    {variant === "orbit" && (
                        <ellipse
                            cx="40"
                            cy="35"
                            rx="25"
                            ry="15"
                            transform="rotate(-32 40 35)"
                            strokeDasharray="38 7"
                        />
                    )}
                    {variant === "groove" && (
                        <>
                            <circle
                                cx="40"
                                cy="35"
                                r="23"
                                strokeOpacity="0.6"
                            />
                            <circle
                                cx="40"
                                cy="35"
                                r="20"
                                strokeOpacity="0.35"
                            />
                        </>
                    )}
                    {variant === "ignition" && (
                        <path
                            d="m29 18 4-6m14 6-4-6M20 30l-4-2m44 2 4-2"
                            strokeWidth="1.5"
                        />
                    )}
                    {variant === "longplay" && (
                        <path
                            d="M19 28v14m4-19v24m34-24v24m4-19v14"
                            strokeWidth="1.5"
                        />
                    )}
                    {variant === "atlas" && (
                        <>
                            <path d="m40 11 3 5-3 5-3-5ZM18 39l4-4-4-4m44 8-4-4 4-4" />
                            <path
                                d="M25 18Q40 10 55 18"
                                strokeDasharray="1 4"
                            />
                        </>
                    )}
                    {variant === "voyager" && (
                        <>
                            <path d="m24 20 2-5 2 5 5 2-5 2-2 5-2-5-5-2Zm31 21 1-3 1 3 3 1-3 1-1 3-1-3-3-1Z" />
                            <path d="m47 14 9 6" strokeDasharray="1 3" />
                        </>
                    )}
                </g>
                <path
                    d="M21 48q-6-7-4-16m42 16q6-7 4-16"
                    stroke="var(--medal-highlight)"
                    strokeOpacity="0.55"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                />
                <path
                    d="m28 58 12 7 12-7"
                    stroke="var(--medal-highlight)"
                    strokeOpacity="0.6"
                    strokeLinecap="round"
                />
            </svg>
            <Image
                className={styles.emblemLogo}
                src="/logo-192.png"
                alt=""
                width={32}
                height={32}
            />
            <span className={styles.emblemTier}>{tier}</span>
            {!earned && <LockKeyhole className={styles.emblemLock} size={13} />}
        </span>
    );
}
