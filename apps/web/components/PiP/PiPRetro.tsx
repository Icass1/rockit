"use client";

import { useState, type JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import type { PiPLyricsState } from "@/models/types/pip";
import { rockIt } from "@/lib/rockit/rockIt";
import { PiPControls } from "@/components/PiP/PiPControls";
import { PiPCover } from "@/components/PiP/PiPCover";
import { PiPInfo } from "@/components/PiP/PiPInfo";
import { PiPLyrics } from "@/components/PiP/PiPLyrics";
import { PiPProgress } from "@/components/PiP/PiPProgress";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export function PiPRetro({
    lyrics,
    showLyrics,
    onToggleLyrics,
}: {
    lyrics: PiPLyricsState;
    showLyrics: boolean;
    onToggleLyrics: () => void;
}): JSX.Element {
    const vocabulary = useVocabulary();
    const playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const [menu, setMenu] = useState(false);
    const toggle = (): void =>
        rockIt.mediaPlayerManager.togglePlayPauseOrSetMedia();
    const label = playing ? vocabulary.PAUSE : vocabulary.PLAY;
    return (
        <div className="pip-retro-body">
            <div className="pip-retro-screen">
                <div className="pip-retro-status">
                    <strong>RockIt!</strong>
                    <span>{vocabulary.NOW_PLAYING}</span>
                </div>
                <div className="pip-retro-content">
                    <PiPCover />
                    {showLyrics && <PiPLyrics {...lyrics} />}
                </div>
                <PiPInfo />
                <PiPProgress />
                {menu && (
                    <div className="pip-retro-menu">
                        <PiPControls
                            layout="narrow"
                            showLyrics={showLyrics}
                            onToggleLyrics={onToggleLyrics}
                        />
                    </div>
                )}
            </div>
            <div className="pip-retro-wheel">
                <button
                    className="pip-retro-menu-key"
                    aria-expanded={menu}
                    onClick={() => setMenu((value) => !value)}
                >
                    {vocabulary.PIP_RETRO_MENU}
                </button>
                <button
                    className="pip-retro-previous"
                    aria-label={vocabulary.PIP_PREVIOUS}
                    onClick={() => rockIt.queueManager.skipBack()}
                >
                    <SkipBack fill="currentColor" />
                </button>
                <button
                    className="pip-retro-next"
                    aria-label={vocabulary.PIP_NEXT}
                    onClick={() => rockIt.queueManager.skipForward()}
                >
                    <SkipForward fill="currentColor" />
                </button>
                <button
                    className="pip-retro-play"
                    aria-label={label}
                    onClick={toggle}
                >
                    {playing ? (
                        <Pause fill="currentColor" />
                    ) : (
                        <Play fill="currentColor" />
                    )}
                </button>
                <button
                    className="pip-retro-center"
                    aria-label={label}
                    onClick={toggle}
                >
                    <Image
                        className="pip-retro-logo"
                        src="/logo-192.png"
                        alt=""
                        width={64}
                        height={64}
                        draggable={false}
                    />
                </button>
            </div>
        </div>
    );
}
