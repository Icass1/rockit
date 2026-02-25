"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type ContextMenuProps from "@/components/ContextMenu/Props";

export default function ContextMenuTrigger({
    children,
    _setContextMenuOpen,
    _setContextMenuPos,
    _contextMenuOpen,
    _contextMenuDivRef,
}: {
    children: ReactNode;
} & ContextMenuProps) {
    const divRef = useRef<HTMLDivElement>(null);

    const handleContextMenu = (
        event: React.MouseEvent<HTMLDivElement, globalThis.MouseEvent>
    ) => {
        if (!_setContextMenuOpen || !_setContextMenuPos) return;

        event.preventDefault();

        _setContextMenuPos([event.clientX, event.clientY]);
        _setContextMenuOpen((value) => !value);
    };

    useEffect(() => {
        if (!_setContextMenuOpen || innerWidth < 768) return;

        const closeContextMenu = (
            event:
                | MouseEvent
                | React.MouseEvent<HTMLDivElement, globalThis.MouseEvent>
        ) => {
            if (_contextMenuDivRef?.current?.contains(event.target as Node))
                return;
            _setContextMenuOpen(false);
        };

        if (_contextMenuOpen) {
            document.addEventListener("mouseup", closeContextMenu);
            document.addEventListener("wheel", closeContextMenu);
        }
        return () => {
            document.removeEventListener("mouseup", closeContextMenu);
            document.removeEventListener("wheel", closeContextMenu);
        };
    }, [_contextMenuOpen, _contextMenuDivRef, _setContextMenuOpen]);

    return (
        <div ref={divRef} onContextMenu={handleContextMenu}>
            {children}
        </div>
    );
}
