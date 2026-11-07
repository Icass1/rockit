import type { MediaPlayerManager } from "@/lib/managers/mediaPlayerManager";
import type { UserManager } from "@/lib/managers/userManager";

export interface VolumePreferenceServices {
    userManager: Pick<UserManager, "sessionAtom">;
    mediaPlayerManager: Pick<MediaPlayerManager, "volume" | "volumeAtom">;
}
