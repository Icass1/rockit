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
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);
    const longPressFired = useRef(false);

    const clearLongPress = (): void => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        touchStartPos.current = null;
    };

    useEffect((): (() => void) => {
        return clearLongPress;
    }, []);

    const handleContextMenu = (
        event: React.MouseEvent<HTMLDivElement, globalThis.MouseEvent>
    ): void => {
        if (!_setContextMenuOpen || !_setContextMenuPos) return;

        // Ignore contextmenu if it was triggered by a handled long-press
        if (longPressFired.current) {
            longPressFired.current = false;
            event.preventDefault();
            return;
        }

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

    const handleTouchStart = (
        event: React.TouchEvent<HTMLDivElement>
    ): void => {
        if (!_setContextMenuOpen || !_setContextMenuPos) return;

        event.preventDefault();

        const touch = event.touches[0];
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };

        longPressTimer.current = setTimeout((): void => {
            if (!touchStartPos.current) return;
            longPressFired.current = true;
            _setContextMenuPos([
                touchStartPos.current.x,
                touchStartPos.current.y,
            ]);
            _setContextMenuOpen((value): boolean => !value);
            longPressTimer.current = null;
            touchStartPos.current = null;
        }, 500);
    };

    const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>): void => {
        if (!touchStartPos.current) return;

        const touch = event.touches[0];
        const dx = Math.abs(touch.clientX - touchStartPos.current.x);
        const dy = Math.abs(touch.clientY - touchStartPos.current.y);
        if (dx > 10 || dy > 10) {
            clearLongPress();
        }
    };

    const handleTouchEnd = (): void => {
        clearLongPress();
    };

    return (
        <div
            ref={divRef}
            onContextMenu={handleContextMenu}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {children}
        </div>
    );
}
