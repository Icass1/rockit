import type { JSX } from "react";
import { isSearchResult } from "@rockit/shared";
import { Send } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";

export default function ShareAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    return (
        <ContextMenuOption
            onClick={() => {
                if (!isSearchResult(media))
                    rockIt.sharingManager.compose(media.publicId);
            }}
        >
            <Send size={16} />
            {vocabulary.FRIENDS_SHARE}
        </ContextMenuOption>
    );
}
