import { useId, type CSSProperties, type JSX } from "react";
import styles from "@/components/Header/StreakFlame.module.css";

/** Visual intensity stops growing at 30 days; the streak count remains exact. */
export default function StreakFlame({ days }: { days: number }): JSX.Element {
    const id = useId();
    const heat = Math.min(Math.max((days - 1) / 29, 0), 1);
    const crown = `color-mix(in hsl, var(--theme-flame-crown-cold), var(--theme-flame-crown-hot) ${heat * 100}%)`;
    const body = `color-mix(in hsl, var(--theme-flame-body-cold), var(--theme-flame-body-hot) ${heat * 100}%)`;
    const base = `color-mix(in hsl, var(--theme-flame-base-cold), var(--theme-flame-base-hot) ${heat * 100}%)`;

    return (
        <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 28 28"
            width="28"
            height="28"
            className={styles.flame}
            style={
                {
                    "--streak-glow-radius": `${heat * 4}px`,
                    "--streak-glow-color": `color-mix(in srgb, var(--theme-flame-glow) ${heat * 45}%, transparent)`,
                } as CSSProperties
            }
        >
            <defs>
                <linearGradient id={`${id}-fire`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={crown} />
                    <stop offset="52%" stopColor={body} />
                    <stop offset="100%" stopColor={base} />
                </linearGradient>
                <linearGradient id={`${id}-core`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                        offset="0%"
                        stopColor="var(--theme-flame-core-start)"
                    />
                    <stop
                        offset="100%"
                        stopColor="var(--theme-flame-core-end)"
                    />
                </linearGradient>
            </defs>
            <path
                className={styles.body}
                d="M15.4 2.5c.7 4.6-4.8 6.3-4.4 10.5-1.7-.9-2.6-2.3-2.7-4.1C5.6 11.5 4.2 14 4.2 17.1a9.8 9.8 0 0 0 19.6 0c0-4.6-2.6-8.3-8.4-14.6Z"
                fill={`url(#${id}-fire)`}
                stroke={crown}
                strokeWidth="0.8"
                strokeLinejoin="round"
            />
            <path
                className={styles.core}
                d="M15.3 13.4c.2 3.4-3.9 4.3-4.3 7.1-.2 1.8 1.1 3.2 3 3.2 2.5 0 4-1.7 3.8-3.9-.1-2-1.1-4-2.5-6.4Z"
                fill={`url(#${id}-core)`}
                opacity={0.12 + heat * 0.78}
            />
        </svg>
    );
}
