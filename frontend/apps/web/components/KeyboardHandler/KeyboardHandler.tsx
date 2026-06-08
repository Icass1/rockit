"use client";

import { useEffect } from "react";
import { rockIt } from "@/lib/rockit/rockIt";

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isEditableTarget(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    if (INPUT_TAGS.has(target.tagName)) return true;
    if (target.isContentEditable) return true;
    return false;
}

export default function KeyboardHandler(): null {
    useEffect((): (() => void) => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (isEditableTarget(event.target)) return;

            const key = event.key;

            switch (key) {
                case " ":
                case "k":
                case "K":
                    event.preventDefault();
                    rockIt.mediaPlayerManager.togglePlayPause();
                    break;

                case "ArrowLeft":
                case "j":
                case "J":
                    event.preventDefault();
                    rockIt.queueManager.skipBack();
                    break;

                case "ArrowRight":
                case "l":
                case "L":
                    event.preventDefault();
                    rockIt.queueManager.skipForward();
                    break;

                case "m":
                case "M":
                    rockIt.mediaPlayerManager.toggleMute();
                    break;

                case "ArrowUp":
                    event.preventDefault();
                    rockIt.mediaPlayerManager.volume = Math.min(
                        1,
                        (Math.sqrt(rockIt.mediaPlayerManager.volume) + 0.05) ** 2,
                    );
                    break;

                case "ArrowDown":
                    event.preventDefault();
                    rockIt.mediaPlayerManager.volume = Math.max(
                        0,
                        (Math.sqrt(rockIt.mediaPlayerManager.volume) - 0.05) ** 2,
                    );
                    break;

                case "s":
                case "S":
                    rockIt.userManager.toggleRandomQueue();
                    break;

                case "r":
                case "R":
                    rockIt.userManager.cycleRepeatMode();
                    break;

                case "Escape":
                    rockIt.playerUIManager.hide();
                    break;
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return (): void =>
            document.removeEventListener("keydown", handleKeyDown);
    }, []);

    return null;
}
