import type { ReactNode, RefObject } from "react";
import React from "react";
import ContextMenuContentDiv from "./ContextMenuContentDiv";
import useWindowSize from "@/hooks/useWindowSize";

export default function ContextMenuContent({
    children,
    contextMenuOpen,
    contextMenuPos,
    contextMenuDivRef,
    setContextMenuOpen,
    setContextMenuPos,
    cover,
    title,
    description,
}: {
    children?: ReactNode;
    contextMenuOpen?: boolean;
    contextMenuPos?: [number, number];
    contextMenuDivRef?: RefObject<HTMLDivElement>;
    setContextMenuOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    setContextMenuPos?: React.Dispatch<React.SetStateAction<[number, number]>>;
    cover?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
}) {
    const updatePos = (
        contextMenuPos: [number, number],
        width: number,
        height: number
    ) => {
        let tempPos = [...contextMenuPos] as [number, number];

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

    const innerWidth = useWindowSize().width;

    const childrenWithProps = React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child, {
                // @ts-ignore
                contextMenuOpen: contextMenuOpen,
                setContextMenuOpen: setContextMenuOpen,
                contextMenuPos: contextMenuPos,
                setContextMenuPos: setContextMenuPos,
                contextMenuDivRef: contextMenuDivRef,
            });
        }
        return child;
    });

    if (!contextMenuPos) return;
    if (!contextMenuOpen) return;
    if (contextMenuPos[0] == 0 && contextMenuPos[1] == 0) return;

    return (
        <ContextMenuContentDiv
            divRef={contextMenuDivRef}
            onDimensionsCalculated={
                innerWidth > 768
                    ? (width, height) =>
                          updatePos(contextMenuPos, width, height)
                    : undefined
            }
            onClick={() => setContextMenuOpen && setContextMenuOpen(false)}
            className="fixed bg-neutral-800/90 top-0 left-0 w-full h-[calc(100%_-_4rem)] px-10 md:w-max md:h-auto rounded-md md:p-1 overflow-auto md:shadow-[0px_0px_20px_3px_#0e0e0e] z-20"
            style={{
                display: contextMenuOpen ? "block" : "none",
            }}
        >
            <div className="overflow-y-auto h-full flex flex-col gap-y-1 py-20 md:py-0">
                {cover && (
                    <img
                        src={cover}
                        alt="cover"
                        className="md:hidden w-52 h-52 mx-auto rounded"
                    />
                )}
                {title && (
                    <label className="md:hidden mx-auto text-xl font-semibold text-center">
                        {title}
                    </label>
                )}
                {description && (
                    <label className="md:hidden mx-auto text-stone-400 text-center">
                        {description}
                    </label>
                )}
                {childrenWithProps}
                <div className="md:hidden min-h-2"></div>
            </div>
        </ContextMenuContentDiv>
    );
}
