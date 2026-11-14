import { useState } from "react";
import { useStore } from "@nanostores/react";
import { isSong, shouldKeepVinyl, type TQueueMedia } from "@rockit/shared";
import { VinylRecord } from "@rockit/ui/primitives/VinylRecord";
import { useOfflineArtwork } from "@/hooks/useOfflineArtwork";
import { rockIt } from "@/lib/rockit/rockIt";
import PlayerCover from "@/components/Player/PlayerCover";

/** Keep one physical disc for an album, including backwards and shuffled navigation. */
export default function PlayerArtwork({
    media,
    size,
    playing,
    visible = true,
}: {
    media: TQueueMedia | undefined;
    size: number;
    playing: boolean;
    visible?: boolean;
}) {
    const vinyl = useStore(rockIt.playerUIManager.vinylModeAtom);
    const uri = useOfflineArtwork(media?.publicId, media?.imageUrl);
    const [record, setRecord] = useState({ media, key: 0 });
    let key = record.key;
    if (record.media !== media) {
        if (record.media && media && !shouldKeepVinyl(record.media, media))
            key++;
        setRecord({ media, key });
    }
    if (vinyl && media && isSong(media)) {
        return (
            <VinylRecord
                key={key}
                size={size}
                label={media.name}
                playing={playing}
                visible={visible}
                cover={
                    <PlayerCover
                        uri={uri}
                        mediaType="song"
                        size={(size * 2) / 3}
                    />
                }
            />
        );
    }
    return <PlayerCover uri={uri} mediaType={media?.type} size={size} />;
}
