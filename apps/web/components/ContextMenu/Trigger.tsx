"use client";

import { JSX, useEffect, useRef, type ReactNode } from "react";
import { useContextMenu } from "@/components/ContextMenu/context";

export default function ContextMenuTrigger({
    children,
    openOnLeftClick,
    className,
}: {
    children: ReactNode;
    openOnLeftClick?: boolean;
    className?: string;
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
            event.preventDefault();
            return;
        }

        event.preventDefault();

        _setContextMenuPos([event.clientX, event.clientY]);
        _setContextMenuOpen((value): boolean => !value);
    };

    useEffect((): (() => void) | undefined => {
        if (!_setContextMenuOpen) return;

        const closeContextMenu = (
            event:
                | MouseEvent
                | React.MouseEvent<HTMLDivElement, globalThis.MouseEvent>
        ): void => {
            if (_contextMenuDivRef?.current?.contains(event.target as Node))
                return;
            // Chromium fires contextmenu before the right-button mouseup. That
            // release belongs to the opening gesture and must not close the menu.
            if (
                event.type === "mouseup" &&
                (event.button !== 0 ||
                    (longPressFired.current &&
                        divRef.current?.contains(event.target as Node)))
            )
                return;
            // A new right-click closes other menus, but not the trigger opening it.
            if (
                event.type === "contextmenu" &&
                divRef.current?.contains(event.target as Node)
            )
                return;
            _setContextMenuOpen(false);
        };

        if (_contextMenuOpen) {
            document.addEventListener("mouseup", closeContextMenu);
            document.addEventListener("wheel", closeContextMenu);
            document.addEventListener("contextmenu", closeContextMenu);
        }
        return (): void => {
            document.removeEventListener("mouseup", closeContextMenu);
            document.removeEventListener("wheel", closeContextMenu);
            document.removeEventListener("contextmenu", closeContextMenu);
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
        // Search cards open on a tap; preserve native clicks and horizontal scrolling.
        if (openOnLeftClick || !_setContextMenuOpen || !_setContextMenuPos)
            return;

        longPressFired.current = false;

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
            role={openOnLeftClick ? "button" : undefined}
            tabIndex={openOnLeftClick ? 0 : undefined}
            aria-haspopup={openOnLeftClick ? "dialog" : undefined}
            aria-expanded={openOnLeftClick ? _contextMenuOpen : undefined}
            onClickCapture={(event): void => {
                if (!longPressFired.current) return;
                event.preventDefault();
                event.stopPropagation();
                longPressFired.current = false;
            }}
            onKeyDown={(event): void => {
                const contextKey =
                    event.key === "ContextMenu" ||
                    (event.shiftKey && event.key === "F10");
                if (
                    event.defaultPrevented ||
                    (!contextKey &&
                        (!openOnLeftClick ||
                            event.target !== event.currentTarget ||
                            !["Enter", " "].includes(event.key)))
                )
                    return;
                event.preventDefault();
                event.stopPropagation();
                const bounds = event.currentTarget.getBoundingClientRect();
                _setContextMenuPos?.([
                    Math.max(1, bounds.left),
                    Math.max(1, bounds.top),
                ]);
                _setContextMenuOpen?.((value) => contextKey || !value);
            }}
            className={`${className ?? ""} ${openOnLeftClick ? "rounded-lg focus-visible:outline-2 focus-visible:outline-white" : ""}`}
            onTouchCancel={clearLongPress}
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
