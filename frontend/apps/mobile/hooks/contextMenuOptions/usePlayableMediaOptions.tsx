import { useCallback } from "react";
import useHandlePlay from "@/callbacks/handlePlay";
import { isDownloadable, TMedia, TPlayableMedia } from "@rockit/shared";
import { Download, Play } from "lucide-react-native";
import { useDownloads } from "@/hooks/useDownloads";
import { ContextMenuOption } from "@/lib/ContextMenuContext";
import { useVocabulary } from "@/lib/vocabulary";

export default function useBasePlayableMediaOptions(
    media: TPlayableMedia,
    allMedia: TMedia[]
) {
    const options: ContextMenuOption[] = [];
    const { vocabulary } = useVocabulary();
    const { startDownload } = useDownloads();

    const handlePlay = useHandlePlay(media, allMedia);

    const handleDownload = useCallback(() => {
        startDownload(media.providerUrl);
    }, [media, startDownload]);

    if (isDownloadable(media) && !media.downloaded) {
        options.push({
            label: vocabulary.DOWNLOAD,
            icon: Download,
            onPress: handleDownload,
        });
    } else {
        options.push({
            label: vocabulary.PLAY,
            icon: Play,
            onPress: handlePlay,
        });
    }
    return options;
}
