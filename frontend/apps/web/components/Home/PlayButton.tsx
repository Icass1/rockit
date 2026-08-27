"use client";

import { useId, type JSX } from "react";
import { Play } from "lucide-react";

interface PlayButtonProps {
    isPlaying: boolean;
    onClick: (e: React.MouseEvent) => void;
    size?: number;
    label: string;
}

export default function PlayButton({
    isPlaying,
    onClick,
    size = 48,
    label,
}: PlayButtonProps): JSX.Element {
    const uid = useId().replace(/:/g, "");

    return (
        <button
            type="button"
            aria-label={label}
            aria-pressed={isPlaying}
            onClick={onClick}
            className="flex items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95"
            style={{ width: size, height: size }}
        >
            {isPlaying ? (
                <span
                    className="flex items-end gap-[3px]"
                    style={{ height: size * 0.4 }}
                    aria-hidden="true"
                >
                    <span className={`${uid} bar`} />
                    <span className={`${uid} bar`} />
                    <span className={`${uid} bar`} />
                    <style>{`
                        .${uid}.bar {
                            width: 3px;
                            background: currentColor;
                            border-radius: 2px;
                            animation: ${uid}-bounce 900ms ease-in-out infinite;
                            height: 60%;
                        }
                        .${uid}.bar:nth-child(1) { animation-delay: -600ms; }
                        .${uid}.bar:nth-child(2) { animation-delay: -300ms; }
                        .${uid}.bar:nth-child(3) { animation-delay: 0ms; }
                        @keyframes ${uid}-bounce {
                            0%, 100% { height: 30%; }
                            50% { height: 100%; }
                        }
                        @media (prefers-reduced-motion: reduce) {
                            .${uid}.bar { animation: none !important; }
                        }
                    `}</style>
                </span>
            ) : (
                <Play
                    fill="currentColor"
                    style={{ width: size * 0.4, height: size * 0.4 }}
                    className="translate-x-[1px]"
                />
            )}
        </button>
    );
}
