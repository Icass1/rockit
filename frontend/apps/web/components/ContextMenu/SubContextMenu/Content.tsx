import type { ReactNode } from "react";
import { useContextMenu } from "@/components/ContextMenu/context";
import { useSubContextMenu } from "@/components/ContextMenu/SubContextMenu/context";
import PosAfterRenderDiv from "@/components/PosAfterRenderDiv";

export default function SubContextMenuContent({
    children,
}: {
    children: ReactNode[] | ReactNode;
}) {
    const {
        _contextMenuPos,
        _contextMenuDivRef,
        _setContextMenuOpen,
        _setContextMenuPos,
        _contextMenuOpen,
    } = useContextMenu();
    const { _triggerRef, _hover, _setHover } = useSubContextMenu();

    const updatePos: (width: number, height: number) => [number, number] = (
        width: number
    ) => {
        const triggerBoundaries = _triggerRef?.current?.getBoundingClientRect();
        const contextMenuBoundaries =
            _contextMenuDivRef?.current?.getBoundingClientRect();

        if (
            !contextMenuBoundaries ||
            !triggerBoundaries ||
            !_triggerRef?.current
        )
            return [0, 0];

        let x = contextMenuBoundaries.x + contextMenuBoundaries.width + 3;
        const y = triggerBoundaries.y;

        if (x + width > innerWidth) {
            x = contextMenuBoundaries.x - width - 3;
        }

        return [x, y];
    };

    if (!_hover) return;

    return (
        <PosAfterRenderDiv
            className="fixed top-0 left-0 h-[calc(100%_-_4rem)] w-full rounded-md bg-neutral-800/90 px-10 md:h-fit md:w-max md:p-1 md:shadow-[0px_0px_20px_3px_#0e0e0e]"
            onDimensionsCalculated={
                innerWidth > 768
                    ? (width, height) => updatePos(width, height)
                    : undefined
            }
            onClick={(event) => {
                event.stopPropagation();
                if (_setHover) _setHover(false);
            }}
            onMouseEnter={() => {
                if (_setHover) _setHover(true);
            }}
            onMouseLeave={() => {
                if (_setHover) {
                    _setHover(false);
                }
            }}
        >
            <div className="flex flex-col gap-y-1 overflow-y-auto py-20 md:h-fit md:py-0">
                {children}
            </div>
        </PosAfterRenderDiv>
    );
}
