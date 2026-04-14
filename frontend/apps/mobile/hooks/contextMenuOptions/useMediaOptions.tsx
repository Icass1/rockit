import { TMedia } from "@rockit/shared";
import { ContextMenuOption } from "@/lib/ContextMenuContext";
import { useVocabulary } from "@/lib/vocabulary";

export default function useBaseMediaOptions(media: TMedia) {
    const options: ContextMenuOption[] = [];
    const { vocabulary } = useVocabulary();

    options.push({
        label: vocabulary.REMOVE_FROM_LIBRARY,
        icon: "trash",
        onPress: () => {},
    });

    return options;
}
