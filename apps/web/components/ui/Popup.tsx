"use client";

import {
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    type HTMLAttributes,
    type JSX,
    type ReactNode,
    type RefObject,
} from "react";
import { createPortal } from "react-dom";
import useWindowSize from "@/hooks/useWindowSize";
import { popupPosition } from "@/lib/utils/popupPosition";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import { Button } from "@/components/ui/Button";

const layers: HTMLElement[] = [];
const controlsSelector =
    'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';

export interface PopupProps extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "children" | "onClose"
> {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    label?: string;
    contentRef?: RefObject<HTMLDivElement | null>;
    anchorRef?: RefObject<HTMLElement | null>;
    parentRef?: RefObject<HTMLElement | null>;
    position?: readonly [number, number];
    calculatePosition?: (width: number, height: number) => [number, number];
    inline?: boolean;
    mobileSheet?: boolean;
}

/** One surface/lifecycle for contextual menus, submenus and anchored popovers. */
export function Popup(props: PopupProps): JSX.Element | null {
    return props.open ? <OpenPopup {...props} /> : null;
}

function OpenPopup({
    open,
    onClose,
    children,
    label,
    contentRef,
    anchorRef,
    parentRef,
    position,
    calculatePosition,
    inline = false,
    mobileSheet = true,
    className = "",
    ...props
}: PopupProps): JSX.Element | null {
    const id = useId();
    const internalRef = useRef<HTMLDivElement>(null);
    const ref = contentRef ?? internalRef;
    const close = useRef(onClose);
    const { width, height } = useWindowSize();
    const sheet =
        mobileSheet && ((width ?? 768) < 768 || (height ?? 500) < 500);
    const vocabulary = useVocabulary();
    useEffect(() => {
        close.current = onClose;
    }, [onClose]);

    useLayoutEffect(() => {
        const node = ref.current;
        if (node && parentRef?.current)
            node.dataset.popupParent = parentRef.current.id;
        if (!open || !node || sheet || inline) return;
        const update = (): void => {
            const bounds = anchorRef?.current?.getBoundingClientRect();
            const point =
                calculatePosition?.(node.offsetWidth, node.offsetHeight) ??
                position ??
                (bounds
                    ? ([bounds.right, bounds.bottom] as const)
                    : ([4, 4] as const));
            const [left, top] = popupPosition(
                point,
                { width: node.offsetWidth, height: node.offsetHeight },
                { width: window.innerWidth, height: window.innerHeight }
            );
            node.style.left = `${left}px`;
            node.style.top = `${top}px`;
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(node);
        window.addEventListener("resize", update);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", update);
        };
    }, [
        open,
        sheet,
        inline,
        ref,
        anchorRef,
        parentRef,
        position,
        calculatePosition,
    ]);

    useEffect(() => {
        const node = ref.current;
        if (!open || !node) return;
        const previous = document.activeElement;
        layers.push(node);
        const visibleControls = (): HTMLElement[] =>
            Array.from(
                node.querySelectorAll<HTMLElement>(controlsSelector)
            ).filter((element) => element.getClientRects().length > 0);
        const frame = requestAnimationFrame(() => {
            (
                node.querySelector<HTMLElement>('[aria-pressed="true"]') ??
                visibleControls()[0] ??
                node
            ).focus();
        });
        const contains = (target: EventTarget | null): boolean =>
            target instanceof Node &&
            (node.contains(target) ||
                !!anchorRef?.current?.contains(target) ||
                (inline && !!node.parentElement?.contains(target)) ||
                layers
                    .slice(layers.indexOf(node) + 1)
                    .some((layer) => layer.contains(target)));
        const outside = (event: Event): void => {
            if (!contains(event.target)) close.current();
        };
        const key = (event: KeyboardEvent): void => {
            if (layers.at(-1) !== node || event.defaultPrevented) return;
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                close.current();
                return;
            }
            const controls = visibleControls();
            const current = controls.indexOf(
                document.activeElement as HTMLElement
            );
            const editable =
                event.target instanceof HTMLElement &&
                event.target.matches(
                    "input, textarea, select, [contenteditable=true]"
                );
            if (
                !editable &&
                ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) &&
                controls.length
            ) {
                event.preventDefault();
                const next =
                    event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? controls.length - 1
                          : (current +
                                (event.key === "ArrowDown" ? 1 : -1) +
                                controls.length) %
                            controls.length;
                controls[next]?.focus();
            }
            if (
                event.key === "Tab" &&
                sheet &&
                controls.length &&
                ((event.shiftKey && current <= 0) ||
                    (!event.shiftKey && current === controls.length - 1))
            ) {
                event.preventDefault();
                (event.shiftKey ? controls.at(-1) : controls[0])?.focus();
            }
        };
        document.addEventListener("pointerdown", outside);
        document.addEventListener("focusin", outside);
        document.addEventListener("wheel", outside, { passive: true });
        document.addEventListener("keydown", key);
        return () => {
            cancelAnimationFrame(frame);
            const index = layers.indexOf(node);
            if (index >= 0) layers.splice(index, 1);
            document.removeEventListener("pointerdown", outside);
            document.removeEventListener("focusin", outside);
            document.removeEventListener("wheel", outside);
            document.removeEventListener("keydown", key);
            if (
                previous instanceof HTMLElement &&
                previous.isConnected &&
                (document.activeElement === document.body ||
                    node.contains(document.activeElement))
            )
                previous.focus();
        };
    }, [open, sheet, inline, ref, anchorRef]);

    if (!open || typeof document === "undefined") return null;
    const content = (
        <>
            {sheet && (
                <button
                    type="button"
                    tabIndex={-1}
                    aria-label={vocabulary.CANCEL}
                    onClick={onClose}
                    className="bg-scrim fixed inset-0 z-40"
                />
            )}
            <div
                id={id}
                {...props}
                ref={ref}
                role="dialog"
                tabIndex={-1}
                aria-label={label ?? vocabulary.MORE_OPTIONS}
                aria-modal={sheet || undefined}
                className={`border-border bg-popover text-popover-foreground z-50 overflow-y-auto border shadow-xl ${sheet ? "fixed inset-x-0 bottom-16 max-h-[calc(100dvh-6rem)] rounded-t-2xl p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]" : inline ? "absolute top-full right-0 mt-3 max-h-[calc(100dvh-8rem)] rounded-xl" : "fixed top-0 left-0 max-h-[calc(100dvh-7rem)] w-max max-w-[calc(100vw-1rem)] rounded-xl p-2"} ${className}`}
            >
                {sheet && (
                    <div className="mb-2 flex justify-end">
                        <Button variant="ghost" onClick={onClose}>
                            {vocabulary.CANCEL}
                        </Button>
                    </div>
                )}
                {children}
            </div>
        </>
    );
    return inline ? content : createPortal(content, document.body);
}
