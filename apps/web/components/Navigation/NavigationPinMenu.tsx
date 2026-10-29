"use client";

import type { JSX, ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuContent from "@/components/ContextMenu/Content";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuTrigger from "@/components/ContextMenu/Trigger";
import { NavigationPinMenuAction } from "@/components/MediaContextMenu/actions/PinNavigationAction";

/** Use the app's real context menu: no persistent pin/unpin button on cards or rows. */
export default function NavigationPinMenu({
    publicId,
    title,
    cover,
    className,
    children,
}: {
    publicId: string;
    title: string;
    cover?: string | null;
    className?: string;
    children: ReactNode;
}): JSX.Element {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    return (
        <ContextMenu>
            <ContextMenuTrigger className={className}>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent title={title} cover={cover || undefined}>
                <NavigationPinMenuAction
                    publicId={publicId}
                    vocabulary={vocabulary}
                />
            </ContextMenuContent>
        </ContextMenu>
    );
}
