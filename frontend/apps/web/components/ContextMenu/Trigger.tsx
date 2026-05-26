"use client";

import { JSX, useEffect, useRef, type ReactNode } from "react";
import { useContextMenu } from "@/components/ContextMenu/context";

export default function ContextMenuTrigger({
    children,
    openOnLeftClick,
}: {
    children: ReactNode;
    openOnLeftClick?: boolean;
}): JSX.Element {
    const {
        _setContextMenuOpen,
        _setContextMenuPos,
        _contextMenuOpen,
        _contextMenuDivRef,
    } = useContextMenu();

    const divRef = useRef<HTMLDivElement>(null);

    const handleContextMenu = (
        event: React.MouseEvent<HTMLDivElement, globalThis.MouseEvent>
    ): void => {
        if (!_setContextMenuOpen || !_setContextMenuPos) return;

        event.preventDefault();

        _setContextMenuPos([event.clientX, event.clientY]);
        _setContextMenuOpen((value): boolean => !value);
    };

    useEffect((): (() => void) | undefined => {
        if (!_setContextMenuOpen || innerWidth < 768) return;

        const closeContextMenu = (
            event:
                | MouseEvent
                | React.MouseEvent<HTMLDivElement, globalThis.MouseEvent>
        ): void => {
            if (_contextMenuDivRef?.current?.contains(event.target as Node))
                return;
            _setContextMenuOpen(false);
        };

        if (_contextMenuOpen) {
            document.addEventListener("mouseup", closeContextMenu);
            document.addEventListener("wheel", closeContextMenu);
        }
        return (): void => {
            document.removeEventListener("mouseup", closeContextMenu);
            document.removeEventListener("wheel", closeContextMenu);
        };
    }, [_contextMenuOpen, _contextMenuDivRef, _setContextMenuOpen]);

    const handleClick = (
        event: React.MouseEvent<HTMLDivElement, globalThis.MouseEvent>
    ): void => {
        if (!openOnLeftClick || !_setContextMenuOpen || !_setContextMenuPos)
            return;

        _setContextMenuPos([event.clientX, event.clientY]);
        _setContextMenuOpen((value): boolean => !value);
    };

    return (
        <div
            ref={divRef}
            onContextMenu={handleContextMenu}
            onClick={handleClick}
        >
            {children}
        </div>
    );
}
