"use client";

import type { ReactNode } from "react";
import { JSX, useEffect } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import useWindowSize from "@/hooks/useWindowSize";
import { rockIt } from "@/lib/rockit/rockIt";
import { useContextMenu } from "@/components/ContextMenu/context";
import PosAfterRenderDiv from "@/components/PosAfterRenderDiv";

export default function ContextMenuContent({
    children,
    cover,
    title,
    description,
}: {
    children?: ReactNode;
    cover?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
}): JSX.Element | undefined {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const {
        _contextMenuOpen,
        _contextMenuPos,
        _contextMenuDivRef,
        _setContextMenuOpen,
    } = useContextMenu();

    const { width: innerWidth, height: innerHeight } = useWindowSize();
    const isDesktop = (innerWidth ?? 0) >= 768 && (innerHeight ?? 0) >= 500;

    useEffect((): (() => void) | undefined => {
        if (!_contextMenuOpen || typeof window === "undefined") return;
        const previousFocus = document.activeElement;
        const frame = window.requestAnimationFrame((): void => {
            const menu = _contextMenuDivRef?.current;
            const selected = menu?.querySelector<HTMLButtonElement>(
                'button[aria-pressed="true"]'
            );
            const first = Array.from(
                menu?.querySelectorAll<HTMLButtonElement>(
                    "button:not(:disabled)"
                ) ?? []
            ).find((button) => button.offsetParent !== null);
            (selected ?? first)?.focus();
        });
        const handleKey = (event: KeyboardEvent): void => {
            if (
                event.key === "Tab" &&
                (window.innerWidth < 768 || window.innerHeight < 500)
            ) {
                const controls = Array.from(
                    _contextMenuDivRef?.current?.querySelectorAll<HTMLElement>(
                        'button:not(:disabled), a[href], [tabindex="0"]'
                    ) ?? []
                ).filter((control) => control.offsetParent !== null);
                const first = controls[0];
                const last = controls[controls.length - 1];
                if (
                    first &&
                    last &&
                    ((event.shiftKey && document.activeElement === first) ||
                        (!event.shiftKey && document.activeElement === last))
                ) {
                    event.preventDefault();
                    (event.shiftKey ? last : first).focus();
                }
            }
            if (event.key !== "Escape") return;
            event.preventDefault();
            _setContextMenuOpen?.(false);
            if (
                previousFocus instanceof HTMLElement &&
                previousFocus.isConnected
            )
                previousFocus.focus();
        };
        document.addEventListener("keydown", handleKey);
        return (): void => {
            window.cancelAnimationFrame(frame);
            document.removeEventListener("keydown", handleKey);
        };
    }, [_contextMenuOpen, _contextMenuDivRef, _setContextMenuOpen]);

    const updatePos = (
        contextMenuPos: [number, number],
        width: number,
        height: number
    ): [number, number] => {
        const tempPos = [...contextMenuPos] as [number, number];

        if (
            height &&
            contextMenuPos[1] + height > document.body.offsetHeight - 96
        ) {
            tempPos[1] = document.body.offsetHeight - 100 - height;
        }

        if (width && contextMenuPos[0] + width > document.body.offsetWidth) {
            tempPos[0] = document.body.offsetWidth - 4 - width;
        }

        return tempPos;
    };

    if (!_contextMenuPos) return;
    if (!_contextMenuOpen) return;
    if (_contextMenuPos[0] === 0 && _contextMenuPos[1] === 0) return;
    if (!innerWidth) return;

    return createPortal(
        <>
            <button
                type="button"
                tabIndex={-1}
                aria-label={vocabulary.CANCEL}
                onClick={(): void => _setContextMenuOpen?.(false)}
                className="fixed inset-0 z-40 bg-black/60 md:hidden"
            />
            <PosAfterRenderDiv
                divRef={_contextMenuDivRef}
                onDimensionsCalculated={
                    isDesktop
                        ? (width, height): [number, number] =>
                              updatePos(_contextMenuPos, width, height)
                        : undefined
                }
                onClick={(): void | undefined =>
                    _setContextMenuOpen && _setContextMenuOpen(false)
                }
                className="fixed bottom-16 left-0 z-50 max-h-[calc(100dvh-6rem)] w-full overflow-auto rounded-t-2xl bg-neutral-900 px-5 py-3 md:top-0 md:bottom-auto md:h-auto md:w-max md:max-w-sm md:rounded-xl md:p-2 md:shadow-[0px_0px_20px_3px_#0e0e0e]"
                style={{
                    display: _contextMenuOpen ? "block" : "none",
                }}
            >
                <div
                    role="dialog"
                    aria-modal={!isDesktop}
                    aria-label={title}
                    className="flex max-h-[calc(100dvh-8rem)] flex-col gap-y-1 overflow-y-auto"
                >
                    <button
                        type="button"
                        onClick={(): void => _setContextMenuOpen?.(false)}
                        className="mb-3 flex min-h-11 items-center gap-2 self-end rounded-full px-4 text-sm text-white focus-visible:outline-2 focus-visible:outline-white md:hidden"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                        {vocabulary.CANCEL}
                    </button>
                    <div className="mb-3 flex items-center gap-3 px-2">
                        {cover && (
                            <Image
                                width={64}
                                height={64}
                                src={cover}
                                alt=""
                                className="h-16 w-16 shrink-0 rounded-lg object-cover md:h-12 md:w-12"
                            />
                        )}
                        <div className="min-w-0">
                            {title && (
                                <p className="line-clamp-2 text-base font-semibold text-white">
                                    {title}
                                </p>
                            )}
                            {description && (
                                <p className="truncate text-sm text-neutral-300">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                    {children}
                    <div className="min-h-2 md:hidden"></div>
                </div>
            </PosAfterRenderDiv>
        </>,
        document.body
    );
}
