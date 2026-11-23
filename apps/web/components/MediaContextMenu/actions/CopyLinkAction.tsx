import type { JSX } from "react";
import { isSearchResult } from "@rockit/shared";
import { Link } from "lucide-react";
import {
    copyPublicMediaLink,
    copyPublicMediaLinkAtCurrentTime,
} from "@/lib/services/publicSharing";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";
import ContextMenuOption from "@/components/ui/ContextMenu/Option";

export default function CopyLinkAction({
    media,
    vocabulary,
    withTimestamp = false,
}: ActionComponentProps & { withTimestamp?: boolean }): JSX.Element {
    return (
        <ContextMenuOption
            onClick={() => {
                if (!isSearchResult(media)) {
                    void (withTimestamp
                        ? copyPublicMediaLinkAtCurrentTime(media)
                        : copyPublicMediaLink(media));
                }
            }}
        >
            <Link size={16} />
            {withTimestamp
                ? vocabulary.SHARING_COPY_LINK_AT_CURRENT_TIME
                : vocabulary.SHARING_COPY_LINK}
        </ContextMenuOption>
    );
}
