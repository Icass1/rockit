"use client";

import {
    useEffect,
    useRef,
    useSyncExternalStore,
    type CSSProperties,
    type JSX,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const subscribe = (): (() => void) => () => {};
const clientSnapshot = (): boolean => true;
const serverSnapshot = (): boolean => false;

/** Native dialog owns focus containment, Escape handling and focus restoration. */
export function Dialog({
    open,
    onClose,
    titleId,
    children,
    className = "",
    style,
}: {
    open: boolean;
    onClose: () => void;
    titleId: string;
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
}): JSX.Element | null {
    const mounted = useSyncExternalStore(
        subscribe,
        clientSnapshot,
        serverSnapshot
    );
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (!open) {
            if (dialog.open) dialog.close();
            return;
        }
        const trigger =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        if (!dialog.open) dialog.showModal();
        return () => {
            document.body.style.overflow = overflow;
            if (dialog.open) dialog.close();
            // A keyed owner can remove the node before native close restores focus.
            if (trigger?.isConnected) trigger.focus({ preventScroll: true });
        };
    }, [open, mounted]);

    if (!mounted) return null;

    // Keep library masonry rules from overriding the dialog's size and margins.
    return createPortal(
        <dialog
            ref={ref}
            style={style}
            aria-labelledby={titleId}
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            onClose={onClose}
            className={`overlay-surface border-border bg-popover text-popover-foreground backdrop:bg-scrim fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-xl ${className}`}
        >
            {children}
        </dialog>,
        document.body
    );
}
