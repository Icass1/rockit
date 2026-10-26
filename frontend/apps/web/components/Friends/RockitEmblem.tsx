"use client";

import type { JSX } from "react";
import Image from "next/image";
import { LockKeyhole } from "lucide-react";
import styles from "@/components/Friends/Friends.module.css";

export default function RockitEmblem({
    variant,
    earned,
    tier = 1,
    difficulty = "easy",
}: {
    variant: string;
    earned: boolean;
    tier?: number;
    difficulty?: string;
}): JSX.Element {
    const contours: Record<string, string> = {
        ignition:
            "M32 3 43 10 55 10 55 23 62 32 55 41 55 54 42 54 32 61 22 54 9 54 9 41 2 32 9 23 9 10 22 10Z",
        orbit: "M32 3A29 29 0 1 1 32 61A29 29 0 1 1 32 3Z",
        groove: "M32 4A28 28 0 1 1 32 60A28 28 0 1 1 32 4Z",
        longplay: "M13 4H51V15A8 8 0 0 0 51 31V59H13V31A8 8 0 0 0 13 15Z",
        atlas: "M20 3H44L61 20V44L44 61H20L3 44V20Z",
        voyager: "M32 2 58 17 58 47 32 62 6 47 6 17Z",
    };
    return (
        <span
            className={styles.emblem}
            data-variant={variant}
            data-earned={earned}
            data-difficulty={difficulty}
            aria-hidden="true"
        >
            <svg viewBox="0 0 64 64" fill="none">
                <path
                    d={contours[variant] ?? contours.orbit}
                    fill="currentColor"
                    fillOpacity="0.08"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
                {variant === "orbit" && (
                    <ellipse
                        cx="32"
                        cy="32"
                        rx="30"
                        ry="12"
                        transform="rotate(-35 32 32)"
                        stroke="currentColor"
                    />
                )}
                {variant === "groove" && (
                    <>
                        <circle
                            cx="32"
                            cy="32"
                            r="24"
                            stroke="currentColor"
                            opacity="0.5"
                        />
                        <circle
                            cx="32"
                            cy="32"
                            r="21"
                            stroke="currentColor"
                            opacity="0.3"
                        />
                    </>
                )}
                {variant === "atlas" && (
                    <path
                        d="M7 23 57 41M23 7 41 57M7 41 57 23"
                        stroke="currentColor"
                        strokeDasharray="2 4"
                        opacity="0.5"
                    />
                )}
                {variant === "voyager" && (
                    <>
                        <path
                            d="m32 8 20 12v24L32 56 12 44V20Z"
                            stroke="currentColor"
                            opacity="0.5"
                        />
                        <circle cx="32" cy="8" r="2" fill="currentColor" />
                        <circle cx="32" cy="56" r="2" fill="currentColor" />
                    </>
                )}
                {variant === "longplay" && (
                    <path
                        d="M20 10h24M20 53h24"
                        stroke="currentColor"
                        strokeDasharray="3 3"
                    />
                )}
            </svg>
            <span className={styles.emblemTier}>{tier}</span>
            <Image
                className={styles.emblemLogo}
                src="/logo-192.png"
                alt=""
                width={36}
                height={36}
            />
            {!earned && <LockKeyhole className={styles.emblemLock} size={13} />}
        </span>
    );
}
