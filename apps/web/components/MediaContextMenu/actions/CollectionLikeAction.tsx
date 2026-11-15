"use client";

import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { useCollectionLikes } from "@rockit/ui/headless/useCollectionLikes";
import { Heart } from "lucide-react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";
import { useContextMenu } from "@/components/ui/ContextMenu/context";

export default function CollectionLikeAction({
    media,
    vocabulary,
}: ActionComponentProps): JSX.Element {
    const { _contextMenuOpen } = useContextMenu();
    const session = useStore(rockIt.userManager.sessionAtom);
    const resource = useCollectionLikes(
        Http,
        media.publicId ?? "",
        session?.username ?? "",
        () => rockIt.userManager.sessionAtom.get() === session,
        !!_contextMenuOpen && !!media.publicId
    );
    const label = resource.error
        ? vocabulary.RETRY
        : resource.data?.allLiked
          ? vocabulary.COLLECTION_UNLIKE_ALL
          : vocabulary.COLLECTION_LIKE_ALL;
    return (
        <button
            type="button"
            role="menuitem"
            disabled={
                resource.loading ||
                resource.busy ||
                resource.data?.ids.length === 0
            }
            className="hover:bg-hover flex w-full items-center gap-3 rounded px-3 py-2 text-left select-none disabled:opacity-50"
            onClick={() => {
                if (resource.error) {
                    void resource.refresh();
                    return;
                }
                void resource
                    .toggle()
                    .catch(() =>
                        rockIt.notificationManager.notifyError(vocabulary.ERROR)
                    )
                    .finally(() => {
                        if (rockIt.userManager.sessionAtom.get() === session)
                            void rockIt.mediaManager.fetchLikedMedia();
                    });
            }}
        >
            <Heart className="h-5 w-5" />
            {label}
        </button>
    );
}
