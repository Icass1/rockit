import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import type { Vocabulary } from "@rockit/shared";
import { LoaderCircle, Pin, PinOff, RefreshCw } from "lucide-react";
import { isPinnableMedia } from "@/lib/utils/navigationPins";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";
import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import ContextMenuOption from "@/components/ui/ContextMenu/Option";

export default function PinNavigationAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    if (!isPinnableMedia(media)) return <></>;
    return (
        <NavigationPinMenuAction
            publicId={media.publicId}
            vocabulary={vocabulary}
        />
    );
}

export function NavigationPinMenuAction({
    publicId,
    vocabulary,
}: {
    publicId: string;
    vocabulary: Vocabulary;
}): JSX.Element {
    const { navigationPinsManager } = useRuntimeServices();
    const pins = useStore(navigationPinsManager.pinsAtom);
    const status = useStore(navigationPinsManager.statusAtom);
    const pending = useStore(navigationPinsManager.pendingAtom);
    const pinned = pins.some((pin) => pin.publicId === publicId);
    const waiting =
        status === "loading" || status === "idle" || pending.includes(publicId);
    const retry = status === "error";
    const Icon = waiting
        ? LoaderCircle
        : retry
          ? RefreshCw
          : pinned
            ? PinOff
            : Pin;
    return (
        <ContextMenuOption
            disable={waiting}
            onClick={() => {
                if (retry) void navigationPinsManager.refreshAsync();
                else
                    void navigationPinsManager.setPinnedAsync(
                        publicId,
                        !pinned
                    );
            }}
        >
            <Icon
                aria-hidden
                className={`h-5 w-5 ${waiting ? "animate-spin motion-reduce:animate-none" : ""}`}
            />
            {waiting
                ? vocabulary.NAV_PINS_LOADING
                : retry
                  ? vocabulary.NAV_PINS_RETRY
                  : pinned
                    ? vocabulary.NAV_UNPIN
                    : vocabulary.NAV_PIN}
        </ContextMenuOption>
    );
}
