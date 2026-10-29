"use client";

/**
 * Web-compatible PlayerContext — re-export from the MobilePlayer hooks.
 *
 * Provides the same usePlayer() / usePlayerTime() API surface that the
 * mobile components expect, backed by the existing rockIt nanostores.
 */
export {
    usePlayer,
    usePlayerTime,
    PlayerProvider,
} from "@/components/MobilePlayer/hooks/usePlayer";
