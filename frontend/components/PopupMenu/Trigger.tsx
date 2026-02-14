import { useEffect, type ReactNode } from "react";
import type PopupMenuProps from "./Props";

export default function PopupMenuTrigger({
    children,
    className,
    _popupMenuOpen,
    _setPopupMenuOpen,
    _setPopupMenuPos,
    _popupMenuContentRef,
    _popupMenuTriggerRef,
}: PopupMenuProps & { children: ReactNode; className?: string }) {
    const handleClick = () => {
        if (!_setPopupMenuOpen || !_setPopupMenuPos) return;

        const boundaries =
            _popupMenuTriggerRef?.current?.getBoundingClientRect();
        if (!boundaries) return;

        _setPopupMenuOpen(true);
        _setPopupMenuPos([boundaries.x + boundaries.width, boundaries.y]);
    };

    useEffect(() => {
        if (!_setPopupMenuOpen || innerWidth < 768) return;

        const closeContextMenu = (
            event:
                | MouseEvent
                | React.MouseEvent<HTMLDivElement, globalThis.MouseEvent>
        ) => {
            if (_popupMenuContentRef?.current?.contains(event.target as Node))
                return;
            _setPopupMenuOpen(false);
        };

        if (_popupMenuOpen) {
            document.addEventListener("mouseup", closeContextMenu);
            document.addEventListener("wheel", closeContextMenu);
        }
        return () => {
            document.removeEventListener("mouseup", closeContextMenu);
            document.removeEventListener("wheel", closeContextMenu);
        };
    }, [_popupMenuOpen, _popupMenuContentRef, _setPopupMenuOpen]);

    return (
        <div
            className={className}
            onClick={handleClick}
            ref={_popupMenuTriggerRef}
        >
            {children}
        </div>
    );
}
