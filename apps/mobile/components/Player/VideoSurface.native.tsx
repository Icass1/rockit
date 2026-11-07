import { useStore } from "@nanostores/react";
import { VideoView, type VideoViewProps } from "expo-video";
import { rockIt } from "@/lib/rockit/rockIt";

export default function VideoSurface(props: Omit<VideoViewProps, "player">) {
    const player = useStore(rockIt.mediaPlayerManager.videoPlayerAtom);
    return player ? <VideoView {...props} player={player} /> : null;
}
