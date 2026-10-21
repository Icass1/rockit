// Public surface of the Player module
export { default as FullPlayer } from "@/components/Player/FullPlayer";
export {
    MINI_PLAYER_HEIGHT,
    default as MiniPlayer,
} from "@/components/Player/MiniPlayer";
export { default as PlayerControls } from "@/components/Player/PlayerControls";
export { default as PlayerCover } from "@/components/Player/PlayerCover";
export { default as PlayerLyrics } from "@/components/Player/PlayerLyrics";
export { default as PlayerProgress } from "@/components/Player/PlayerProgress";
export { default as PlayerQueue } from "@/components/Player/PlayerQueue";
export { default as QueueItem } from "@/components/Player/QueueItem";

// Sub-components (consume directly only if you need finer composition)
export { default as PlayerSongInfo } from "@/components/Player/PlayerMediaInfo";
export { default as PlayerTabsBar } from "@/components/Player/PlayerTabsBar";
export { default as PlayerTabsPanel } from "@/components/Player/PlayerTabsPanel";
export { default as PlayerTopBar } from "@/components/Player/PlayerTopBar";

// Types
export type { PlayerTab } from "@/components/Player/FullPlayer";
