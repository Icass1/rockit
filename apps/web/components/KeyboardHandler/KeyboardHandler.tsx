"use client";

import { useEffect } from "react";
import { usePlaybackServices } from "@/components/providers/PlaybackProvider";

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isEditableTarget(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    if (INPUT_TAGS.has(target.tagName)) return true;
    if (target.isContentEditable) return true;
    return false;
}

export default function KeyboardHandler(): null {
    const { mediaPlayerManager, queueManager, userManager, playerUIManager } =
        usePlaybackServices();
    useEffect((): (() => void) => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (isEditableTarget(event.target)) return;

            const key = event.key;

            switch (key) {
                case " ":
                case "k":
                case "K":
                    event.preventDefault();
                    mediaPlayerManager.togglePlayPause();
                    break;

                case "ArrowLeft":
                case "j":
                case "J":
                    event.preventDefault();
                    queueManager.skipBack();
                    break;

                case "ArrowRight":
                case "l":
                case "L":
                    event.preventDefault();
                    queueManager.skipForward();
                    break;

                case "m":
                case "M":
                    mediaPlayerManager.toggleMute();
                    break;

                case "ArrowUp":
                    event.preventDefault();
                    mediaPlayerManager.volume = Math.min(
                        1,
                        (Math.sqrt(mediaPlayerManager.volume) + 0.05) ** 2
                    );
                    break;

                case "ArrowDown":
                    event.preventDefault();
                    mediaPlayerManager.volume = Math.max(
                        0,
                        (Math.sqrt(mediaPlayerManager.volume) - 0.05) ** 2
                    );
                    break;

                case "s":
                case "S":
                    userManager.toggleRandomQueue();
                    break;

                case "r":
                case "R":
                    userManager.cycleRepeatMode();
                    break;

                case ",":
                    event.preventDefault();
                    mediaPlayerManager.setCurrentTime(
                        mediaPlayerManager.currentTime - 5
                    );
                    break;

                case ".":
                    event.preventDefault();
                    mediaPlayerManager.setCurrentTime(
                        mediaPlayerManager.currentTime + 5
                    );
                    break;

                case "Escape":
                    playerUIManager.hide();
                    break;
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return (): void =>
            document.removeEventListener("keydown", handleKeyDown);
    }, [mediaPlayerManager, queueManager, userManager, playerUIManager]);

    return null;
}
