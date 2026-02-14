"use client";

import type { ReactNode } from "react";
import React from "react";
import PosAfterRenderDiv from "@/components/PosAfterRenderDiv";
import useWindowSize from "@/hooks/useWindowSize";
import type ContextMenuProps from "./Props";
import Image from "next/image";

export default function ContextMenuContent({
    children,
    _contextMenuOpen,
    _contextMenuPos,
    _contextMenuDivRef,
    _setContextMenuOpen,
    _setContextMenuPos,
    cover,
    title,
    description,
}: ContextMenuProps & {
    children?: ReactNode;
    cover?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
}) {
    const updatePos = (
        contextMenuPos: [number, number],
        width: number,
        height: number
    ) => {
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

    const innerWidth = useWindowSize().width;

    const childrenWithProps = React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
            const props: ContextMenuProps = {
                _contextMenuOpen,
                _setContextMenuOpen,
                _contextMenuPos,
                _setContextMenuPos,
                _contextMenuDivRef,
            };

            return React.cloneElement(child, props);
        }
        return child;
    });

    if (!_contextMenuPos) return;
    if (!_contextMenuOpen) return;
    if (_contextMenuPos[0] == 0 && _contextMenuPos[1] == 0) return;
    if (!innerWidth) return;

    return (
        <PosAfterRenderDiv
            divRef={_contextMenuDivRef}
            onDimensionsCalculated={
                innerWidth > 768
                    ? (width, height) =>
                          updatePos(_contextMenuPos, width, height)
                    : undefined
            }
            onClick={() => _setContextMenuOpen && _setContextMenuOpen(false)}
            className="fixed top-0 left-0 z-50 h-[calc(100%_-_4rem)] w-full overflow-auto rounded-md bg-neutral-800/90 px-10 md:h-auto md:w-max md:p-1 md:shadow-[0px_0px_20px_3px_#0e0e0e]"
            style={{
                display: _contextMenuOpen ? "block" : "none",
            }}
        >
            <div className="flex h-full flex-col gap-y-1 overflow-y-auto py-20 md:py-0">
                {cover && (
                    <Image
                        width={208}
                        height={208}
                        src={cover}
                        alt="cover"
                        className="mx-auto h-52 w-52 rounded md:hidden"
                    />
                )}
                {title && (
                    <label className="mx-auto text-center text-xl font-semibold md:hidden">
                        {title}
                    </label>
                )}
                {description && (
                    <label className="mx-auto text-center text-stone-400 md:hidden">
                        {description}
                    </label>
                )}
                {childrenWithProps}
                <div className="min-h-2 md:hidden"></div>
            </div>
        </PosAfterRenderDiv>
    );
}
