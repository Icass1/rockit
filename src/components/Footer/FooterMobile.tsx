import { pause, play, playing, currentSong } from "@/stores/audio";
import { useStore } from "@nanostores/react";
import { Play, Pause } from "lucide-react";
import LikeButton from "../LikeButton";

export default function FooterRightMobile() {
    const $playing = useStore(playing);
    const $currentSong = useStore(currentSong);

    return (
        <div className="flex md:hidden items-center w-fit h-full justify-end px-3 md:px-0 gap-x-5 group">
            {$currentSong && <LikeButton song={$currentSong} />}
            {$playing ? (
                <Pause
                    className="h-full text-white fill-current"
                    onClick={pause}
                />
            ) : (
                <Play
                    className="h-full text-white fill-current"
                    onClick={play}
                />
            )}
        </div>
    );
}
