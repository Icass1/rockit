import type { JSX } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { EMediaType, isSearchResult, isList } from "@rockit/shared";
import type { ActionComponentProps } from "./ActionProps";
import ContextMenuOption from "@/components/ContextMenu/Option";

export default function NavigateAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const router = useRouter();

    const label =
        media.type === EMediaType.Album
            ? vocabulary.GO_TO_ALBUM
            : media.type === EMediaType.Artist
              ? vocabulary.GO_TO_ARTIST
              : vocabulary.OPEN_LIST;

    const navigate = (): void => {
        if (!isSearchResult(media) && (isList(media) || media.type === EMediaType.Artist)) {
            router.push(media.url);
        }
    };

    return (
        <ContextMenuOption onClick={navigate}>
            <ExternalLink className="h-5 w-5" />
            {label}
        </ContextMenuOption>
    );
}
