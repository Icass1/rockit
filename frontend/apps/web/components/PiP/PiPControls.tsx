"use client";

import { useEffect, useRef, type JSX } from "react";
import { useStore } from "@nanostores/react";
import {
    Disc3,
    DiscAlbum,
    Ellipsis,
    Heart,
    Pause,
    Play,
    Repeat,
    Repeat1,
    Shuffle,
    SkipBack,
    SkipForward,
    Subtitles,
} from "lucide-react";
import { ERepeatMode } from "@/models/enums/repeatMode";
import type { PiPLayout } from "@/models/types/pip";
import { usePiPText } from "@/hooks/usePiPText";
import { rockIt } from "@/lib/rockit/rockIt";

interface PiPControlsProps {
    layout: PiPLayout;
    showLyrics: boolean;
    onToggleLyrics: () => void;
}

export function PiPControls({
    layout,
    showLyrics,
    onToggleLyrics,
}: PiPControlsProps): JSX.Element {
    const text = usePiPText();
    const labels = {
        shuffle: text("PIP_SHUFFLE", "Shuffle", "Aleatorio"),
        previous: text("PIP_PREVIOUS", "Previous", "Anterior"),
        next: text("PIP_NEXT", "Next", "Siguiente"),
        play: text("PIP_PLAY", "Play", "Reproducir"),
        pause: text("PIP_PAUSE", "Pause", "Pausar"),
        options: text("PIP_OPTIONS", "More options", "Más opciones"),
        repeatOne: text("PIP_REPEAT_ONE", "Repeat one", "Repetir canción"),
        repeatAll: text("PIP_REPEAT_ALL", "Repeat all", "Repetir todo"),
        repeatOff: text("PIP_REPEAT_OFF", "No repeat", "Sin repetición"),
        like: text("PIP_LIKE", "Like", "Me gusta"),
        unlike: text("PIP_UNLIKE", "Unlike", "Quitar me gusta"),
        showLyrics: text("PIP_SHOW_LYRICS", "Show lyrics", "Mostrar letra"),
        hideLyrics: text("PIP_HIDE_LYRICS", "Hide lyrics", "Ocultar letra"),
        vinyl: text("PIP_SHOW_VINYL", "Show vinyl", "Mostrar vinilo"),
        cover: text("PIP_SHOW_COVER", "Show cover", "Mostrar carátula"),
    };
    const playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const repeat = useStore(rockIt.userManager.repeatModeAtom);
    const queueType = useStore(rockIt.userManager.queueTypeAtom);
    const media = useStore(rockIt.queueManager.currentMediaAtom);
    const liked = useStore(rockIt.mediaManager.likedMediaAtom);
    const vinyl = useStore(rockIt.playerUIManager.vinylModeAtom);
    const menuRef = useRef<HTMLDetailsElement>(null);
    useEffect((): (() => void) | undefined => {
        const menu = menuRef.current;
        if (!menu) return;
        const owner = menu.ownerDocument;
        const dismissOutside = (event: PointerEvent): void => {
            if (event.target && !menu.contains(event.target as Node))
                menu.open = false;
        };
        owner.addEventListener("pointerdown", dismissOutside);
        return (): void =>
            owner.removeEventListener("pointerdown", dismissOutside);
    }, []);
    const shuffled = queueType === "RANDOM";
    const repeatLabel =
        repeat === ERepeatMode.ONE
            ? labels.repeatOne
            : repeat === ERepeatMode.ALL
              ? labels.repeatAll
              : labels.repeatOff;
    const isLiked = !!media && liked.includes(media.publicId);
    const secondary = layout === "full" || layout === "sidebar";
    const action = (callback: () => void): void => {
        callback();
        if (menuRef.current) {
            menuRef.current.open = false;
            menuRef.current.querySelector("summary")?.focus();
        }
    };

    return (
        <div className="pip-controls-bar">
            {secondary && (
                <button
                    type="button"
                    className="pip-controls-icon-btn pip-secondary"
                    aria-label={labels.shuffle}
                    aria-pressed={shuffled}
                    onClick={(): void => rockIt.userManager.toggleRandomQueue()}
                    title={labels.shuffle}
                >
                    <Shuffle className="pip-icon" />
                </button>
            )}
            <button
                type="button"
                className="pip-controls-icon-btn"
                aria-label={labels.previous}
                title={labels.previous}
                onClick={(): void => rockIt.queueManager.skipBack()}
            >
                <SkipBack className="pip-icon" fill="currentColor" />
            </button>
            <button
                type="button"
                className="pip-controls-icon-btn pip-play-button"
                aria-label={playing ? labels.pause : labels.play}
                title={playing ? labels.pause : labels.play}
                onClick={(): void =>
                    rockIt.mediaPlayerManager.togglePlayPauseOrSetMedia()
                }
            >
                {playing ? (
                    <Pause className="pip-play-icon" fill="currentColor" />
                ) : (
                    <Play className="pip-play-icon" fill="currentColor" />
                )}
            </button>
            <button
                type="button"
                className="pip-controls-icon-btn"
                aria-label={labels.next}
                title={labels.next}
                onClick={(): void => rockIt.queueManager.skipForward()}
            >
                <SkipForward className="pip-icon" fill="currentColor" />
            </button>
            {secondary && (
                <button
                    type="button"
                    className="pip-controls-icon-btn pip-secondary"
                    aria-label={repeatLabel}
                    aria-pressed={repeat !== ERepeatMode.OFF}
                    title={repeatLabel}
                    onClick={(): void => rockIt.userManager.cycleRepeatMode()}
                >
                    {repeat === ERepeatMode.ONE ? (
                        <Repeat1 className="pip-icon" />
                    ) : (
                        <Repeat className="pip-icon" />
                    )}
                </button>
            )}
            <details
                className="pip-options"
                ref={menuRef}
                onKeyDown={(event): void => {
                    if (event.key === "Escape" && menuRef.current) {
                        menuRef.current.open = false;
                        menuRef.current.querySelector("summary")?.focus();
                        event.stopPropagation();
                    }
                }}
            >
                <summary
                    className="pip-controls-icon-btn"
                    aria-label={labels.options}
                    title={labels.options}
                >
                    <Ellipsis className="pip-icon" />
                </summary>
                <div className="pip-menu">
                    <button
                        type="button"
                        aria-label={labels.shuffle}
                        aria-pressed={shuffled}
                        onClick={(): void =>
                            action(() => rockIt.userManager.toggleRandomQueue())
                        }
                    >
                        <Shuffle /> {labels.shuffle}
                    </button>
                    <button
                        type="button"
                        aria-label={repeatLabel}
                        aria-pressed={repeat !== ERepeatMode.OFF}
                        onClick={(): void =>
                            action(() => rockIt.userManager.cycleRepeatMode())
                        }
                    >
                        {repeat === ERepeatMode.ONE ? <Repeat1 /> : <Repeat />}{" "}
                        {repeatLabel}
                    </button>
                    {media && (
                        <button
                            type="button"
                            aria-label={isLiked ? labels.unlike : labels.like}
                            aria-pressed={isLiked}
                            onClick={(): void =>
                                action(() => {
                                    void rockIt.mediaManager.toggleLikeMedia(
                                        media.publicId
                                    );
                                })
                            }
                        >
                            <Heart fill={isLiked ? "currentColor" : "none"} />{" "}
                            {isLiked ? labels.unlike : labels.like}
                        </button>
                    )}
                    {media?.type === "song" && (
                        <>
                            <button
                                type="button"
                                aria-label={
                                    showLyrics
                                        ? labels.hideLyrics
                                        : labels.showLyrics
                                }
                                aria-pressed={showLyrics}
                                onClick={(): void => action(onToggleLyrics)}
                            >
                                <Subtitles />{" "}
                                {showLyrics
                                    ? labels.hideLyrics
                                    : labels.showLyrics}
                            </button>
                            <button
                                type="button"
                                aria-label={vinyl ? labels.cover : labels.vinyl}
                                aria-pressed={vinyl}
                                onClick={(): void =>
                                    action(() =>
                                        rockIt.playerUIManager.toggleVinylMode()
                                    )
                                }
                            >
                                {vinyl ? <DiscAlbum /> : <Disc3 />}{" "}
                                {vinyl ? labels.cover : labels.vinyl}
                            </button>
                        </>
                    )}
                </div>
            </details>
        </div>
    );
}
