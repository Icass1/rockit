import type { ReactNode } from "react";
import React from "react";
import PosAfterRenderDiv from "@/components/PosAfterRenderDiv";
import useWindowSize from "@/hooks/useWindowSize";
import type ContextMenuProps from "./Props";
import Image from "@/components/Image";

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
            className="fixed bg-neutral-800/90 top-0 left-0 w-full h-[calc(100%_-_4rem)] px-10 md:w-max md:h-auto rounded-md md:p-1 overflow-auto md:shadow-[0px_0px_20px_3px_#0e0e0e] z-50"
            style={{
                display: _contextMenuOpen ? "block" : "none",
            }}
        >
            <div className="overflow-y-auto h-full flex flex-col gap-y-1 py-20 md:py-0">
                {cover && (
                    <Image
                        width={208}
                        height={208}
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
        </PosAfterRenderDiv>
    );
}
