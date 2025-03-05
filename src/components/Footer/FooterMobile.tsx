import { pause, play, playing, currentSong, currentTime } from "@/stores/audio";
import { useStore } from "@nanostores/react";
import { Play, Pause } from "lucide-react";
import LikeButton from "../LikeButton";
import { isMobilePlayerUIVisible } from "@/stores/isPlayerUIVisible";
import Slider from "../Slider";
import { getImageUrl } from "@/lib/getImageUrl";

export default function FooterMobile() {
    const $playing = useStore(playing);
    const $currentSong = useStore(currentSong);
    const $currentTime = useStore(currentTime);

    return (
        <div className="h-full w-full pb-1">
            <div
                className="items-center h-full w-full group grid grid-cols-[min-content_1fr_min-content_min-content] gap-x-2 pr-2 bg-black/80 rounded-md"
                onClick={() => isMobilePlayerUIVisible.set(true)}
            >
                <div className="aspect-square h-full w-auto ">
                    <img
                        src={getImageUrl({
                            imageId: $currentSong?.image,
                            width: 42,
                            height: 42,
                            placeHolder: "/song-placeholder.png",
                        })}
                        alt="Album Cover"
                        className="w-full h-full p-1 rounded-md"
                    />
                </div>

                <div className="flex flex-col min-w-0">
                    <label className="font-semibold truncate">
                        {$currentSong?.name}
                    </label>
                    <label className="text-sm truncate">
                        {$currentSong?.artists
                            .map((artist) => artist.name)
                            .join(", ")}
                    </label>
                </div>

                {$currentSong && <LikeButton song={$currentSong} />}
                {$playing ? (
                    <Pause
                        className="h-full text-white fill-current"
                        onClick={(event) => {
                            pause();
                            event.stopPropagation();
                        }}
                    />
                ) : (
                    <Play
                        className="h-full text-white fill-current"
                        onClick={(event) => {
                            play();
                            event.stopPropagation();
                        }}
                    />
                )}
            </div>
            <div className="">
                <Slider
                    readOnly
                    id="default-slider"
                    className="relative bottom-[0.15rem] rounded h-[0.15rem] ml-1 mr-1 w-auto bg-neutral-700 group"
                    value={$currentTime ?? 0}
                    min={0}
                    max={$currentSong?.duration}
                    step={0.001}
                />
            </div>
        </div>
    );
}
