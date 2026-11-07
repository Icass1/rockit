"use client";

import type { JSX, ReactNode } from "react";
import { NavigationPinMenuAction } from "@/components/MediaContextMenu/actions/PinNavigationAction";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import ContextMenuContent from "@/components/ui/ContextMenu/Content";
import ContextMenu from "@/components/ui/ContextMenu/ContextMenu";
import ContextMenuTrigger from "@/components/ui/ContextMenu/Trigger";

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
    const vocabulary = useVocabulary();
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
