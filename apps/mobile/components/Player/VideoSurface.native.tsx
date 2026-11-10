import { useStore } from "@nanostores/react";
import { VideoView, type VideoViewProps } from "expo-video";
import { usePlayerServices } from "@/lib/PlayerContext";

export default function VideoSurface(props: Omit<VideoViewProps, "player">) {
    const { mediaPlayerManager } = usePlayerServices();
    const player = useStore(mediaPlayerManager.videoPlayerAtom);
    return player ? <VideoView {...props} player={player} /> : null;
}
