"use client";

import { ReactNode, useEffect, useState } from "react";
import { BaseSearchResultsItem } from "@/dto";
import { Library } from "lucide-react";
import { z } from "zod";
import { rockIt } from "@/lib/rockit/rockIt";
import { apiFetch } from "@/lib/utils/apiFetch";
import ContextMenuContent from "@/components/ContextMenu/Content";
import { useContextMenu } from "@/components/ContextMenu/context";
import ContextMenu from "@/components/ContextMenu/ContextMenu";
import ContextMenuOption from "@/components/ContextMenu/Option";

function SearchItemTrigger({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    const {
        _setContextMenuOpen,
        _setContextMenuPos,
        _contextMenuOpen,
        _contextMenuDivRef,
    } = useContextMenu();

    const handleOpen = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!_setContextMenuOpen || !_setContextMenuPos) return;
        event.preventDefault();
        _setContextMenuPos([event.clientX, event.clientY]);
        _setContextMenuOpen((v) => !v);
    };

    useEffect(() => {
        if (!_setContextMenuOpen || innerWidth < 768) return;

        const close = (event: MouseEvent) => {
            if (_contextMenuDivRef?.current?.contains(event.target as Node))
                return;
            _setContextMenuOpen(false);
        };

        if (_contextMenuOpen) {
            document.addEventListener("mouseup", close);
            document.addEventListener("wheel", close);
        }
        return () => {
            document.removeEventListener("mouseup", close);
            document.removeEventListener("wheel", close);
        };
    }, [_contextMenuOpen, _contextMenuDivRef, _setContextMenuOpen]);

    return (
        <div
            className={className}
            onClick={handleOpen}
            onContextMenu={handleOpen}
        >
            {children}
        </div>
    );
}

export default function SearchItemContextMenu({
    item,
    children,
    className,
}: {
    item: BaseSearchResultsItem;
    children: ReactNode;
    className?: string;
}) {
    const [loading, setLoading] = useState(false);

    const addToLibrary = async () => {
        setLoading(true);
        const res = await apiFetch(
            `/media/url/add?url=${encodeURIComponent(item.providerUrl)}`,
            z.any()
        );
        setLoading(false);

        if (!res.isOk()) {
            rockIt.notificationManager.notifyError(res.message);
        } else {
            rockIt.notificationManager.notifySuccess(
                `"${item.name}" added to library`
            );
        }
    };

    return (
        <ContextMenu>
            <SearchItemTrigger className={className}>
                {children}
            </SearchItemTrigger>
            <ContextMenuContent
                cover={item.imageUrl}
                title={item.name}
                description={item.artists[0]?.name}
            >
                <ContextMenuOption onClick={addToLibrary} disable={loading}>
                    <Library className="h-5 w-5" />
                    Add to Library
                </ContextMenuOption>
            </ContextMenuContent>
        </ContextMenu>
    );
}
