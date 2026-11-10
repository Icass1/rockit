"use client";

import {
    useEffect,
    useRef,
    useSyncExternalStore,
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
}: {
    open: boolean;
    onClose: () => void;
    titleId: string;
    children: ReactNode;
    className?: string;
}): JSX.Element | null {
    const mounted = useSyncExternalStore(
        subscribe,
        clientSnapshot,
        serverSnapshot
    );
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const dialog = ref.current;
        if (open && !dialog?.open) dialog?.showModal();
        else if (!open && dialog?.open) dialog.close();
        return () => {
            if (dialog?.open) dialog.close();
        };
    }, [open, mounted]);

    if (!mounted) return null;

    // Keep library masonry rules from overriding the dialog's size and margins.
    return createPortal(
        <dialog
            ref={ref}
            aria-labelledby={titleId}
            onCancel={onClose}
            onClose={onClose}
            className={`overlay-surface border-border bg-popover text-popover-foreground backdrop:bg-scrim fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-xl ${className}`}
        >
            {children}
        </dialog>,
        document.body
    );
}
