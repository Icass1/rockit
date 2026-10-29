import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { LoaderCircle, Pin, PinOff, RefreshCw } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import { isPinnableMedia } from "@/lib/utils/navigationPins";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";

export default function PinNavigationAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const pins = useStore(rockIt.navigationPinsManager.pinsAtom);
    const status = useStore(rockIt.navigationPinsManager.statusAtom);
    const pending = useStore(rockIt.navigationPinsManager.pendingAtom);
    if (!isPinnableMedia(media)) return <></>;
    const pinned = pins.some((pin) => pin.publicId === media.publicId);
    const waiting =
        status === "loading" ||
        status === "idle" ||
        pending.includes(media.publicId);
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
                if (retry) void rockIt.navigationPinsManager.refreshAsync();
                else
                    void rockIt.navigationPinsManager.setPinnedAsync(
                        media.publicId,
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
