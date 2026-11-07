"use client";

import type { JSX, ReactNode } from "react";
import Image from "next/image";
import { useContextMenu } from "@/components/ui/ContextMenu/context";
import { Popup } from "@/components/ui/Popup";

export default function ContextMenuContent({
    children,
    cover,
    title,
    description,
}: {
    children?: ReactNode;
    cover?: string;
    title?: string;
    description?: string;
}): JSX.Element {
    const {
        _contextMenuOpen,
        _contextMenuPos,
        _contextMenuDivRef,
        _setContextMenuOpen,
    } = useContextMenu();
    return (
        <Popup
            open={!!_contextMenuOpen}
            onClose={() => _setContextMenuOpen?.(false)}
            position={_contextMenuPos}
            contentRef={_contextMenuDivRef}
            label={title}
        >
            {(cover || title || description) && (
                <div className="mb-3 flex items-center gap-3 px-2">
                    {cover && (
                        <Image
                            width={64}
                            height={64}
                            src={cover}
                            alt=""
                            className="size-12 shrink-0 rounded-lg object-cover"
                        />
                    )}
                    <div className="min-w-0">
                        {title && (
                            <p className="line-clamp-2 text-base font-semibold">
                                {title}
                            </p>
                        )}
                        {description && (
                            <p className="text-muted-foreground truncate text-sm">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
            )}
            <div className="flex flex-col gap-1">{children}</div>
        </Popup>
    );
}
