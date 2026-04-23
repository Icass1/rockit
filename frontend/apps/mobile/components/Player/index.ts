// Public surface of the Player module
export { default as FullPlayer } from "./FullPlayer";
export { MINI_PLAYER_HEIGHT, default as MiniPlayer } from "./MiniPlayer";
export { default as PlayerControls } from "./PlayerControls";
export { default as PlayerCover } from "./PlayerCover";
export { default as PlayerLyrics } from "./PlayerLyrics";
export { default as PlayerProgress } from "./PlayerProgress";
export { default as PlayerQueue } from "./PlayerQueue";
export { default as QueueItem } from "./QueueItem";

// Sub-components (consume directly only if you need finer composition)
export { default as PlayerSongInfo } from "./PlayerMediaInfo";
export { default as PlayerTabsBar } from "./PlayerTabsBar";
export { default as PlayerTabsPanel } from "./PlayerTabsPanel";
export { default as PlayerTopBar } from "./PlayerTopBar";

// Types
export type { PlayerTab } from "./FullPlayer";
