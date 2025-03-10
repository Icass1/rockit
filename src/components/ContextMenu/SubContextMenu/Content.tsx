import type { ReactNode, RefObject } from "react";
import React from "react";
import ContextMenuContentDiv from "@/components/ContextMenu/ContextMenuContentDiv";

export default function SubContextMenuContent({
    children,
    contextMenuPos,
    contextMenuDivRef,
    setContextMenuOpen,
    setContextMenuPos,
    contextMenuOpen,
    triggerRef,
    hover,
    setHover,
}: {
    children: ReactNode[] | ReactNode;
    hover?: boolean;
    setHover?: (value: boolean) => void;
    contextMenuOpen?: boolean;
    contextMenuPos?: [number, number];
    contextMenuDivRef?: RefObject<HTMLDivElement>;
    setContextMenuOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    setContextMenuPos?: React.Dispatch<React.SetStateAction<[number, number]>>;

    triggerRef?: RefObject<HTMLDivElement>;
}) {
    const childrenWithProps = React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child, {
                // @ts-ignore
                contextMenuOpen,
                setContextMenuOpen,
                contextMenuPos,
                setContextMenuPos,
                contextMenuDivRef,
            });
        }
        return child;
    });

    const triggerBoundaries = triggerRef?.current?.getBoundingClientRect();
    const contextMenuBoundaries =
        contextMenuDivRef?.current?.getBoundingClientRect();

    if (!contextMenuBoundaries || !triggerBoundaries || !triggerRef?.current)
        return;

    const updatePos: (width: number, height: number) => [number, number] = (
        width: number,
        height: number
    ) => {
        console.log(width, height);

        let x = contextMenuBoundaries.x + contextMenuBoundaries.width + 3;
        const y = triggerBoundaries.y;

        if (x + width > innerWidth) {
            x = contextMenuBoundaries.x - width - 3;
        }

        return [x, y];
    };

    if (!hover) return;

    return (
        <ContextMenuContentDiv
            className="fixed bg-neutral-800/90 top-0 left-0 w-full h-[calc(100%_-_4rem)] px-10 md:shadow-[0px_0px_20px_3px_#0e0e0e] rounded-md md:p-1 md:w-max"
            onDimensionsCalculated={
                innerWidth > 768
                    ? (width, height) => updatePos(width, height)
                    : undefined
            }
            onClick={(event) => {
                event.stopPropagation();
                if (setHover) setHover(false);
            }}
            onMouseEnter={() => {
                if (setHover) setHover(true);
            }}
            onMouseLeave={() => {
                if (setHover) {
                    setHover(false);
                }
            }}
        >
            <div className="overflow-y-auto h-full flex flex-col gap-y-1 py-20 md:py-0">
                {childrenWithProps}
            </div>
        </ContextMenuContentDiv>
    );
}
