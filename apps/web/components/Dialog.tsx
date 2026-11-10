"use client";

import { useEffect, useId, useRef, type JSX, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** A centered modal with the popup surface and arbitrary fields or actions. */
export default function Dialog({
    open,
    onClose,
    title,
    children,
}: {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    children: ReactNode;
}): JSX.Element | null {
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = ref.current;
        if (!open || !dialog) return;
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        dialog.showModal();
        return (): void => {
            dialog.close();
            document.body.style.overflow = previousOverflow;
            if (previousFocus instanceof HTMLElement) previousFocus.focus();
        };
    }, [open]);

    if (!open || typeof document === "undefined") return null;

    return createPortal(
        <dialog
            ref={ref}
            aria-labelledby={titleId}
            className="overlay-surface fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto p-6"
            onCancel={(event): void => {
                event.preventDefault();
                onClose();
            }}
            onClick={(event): void => {
                if (event.target !== event.currentTarget) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                if (
                    event.clientX < bounds.left ||
                    event.clientX > bounds.right ||
                    event.clientY < bounds.top ||
                    event.clientY > bounds.bottom
                )
                    onClose();
            }}
        >
            <h2 id={titleId} className="mb-4 text-base font-semibold">
                {title}
            </h2>
            {children}
        </dialog>,
        document.body
    );
}
