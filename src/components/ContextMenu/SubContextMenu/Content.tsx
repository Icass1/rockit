import type { ReactNode } from "react";
import React, { useEffect } from "react";
import PosAfterRenderDiv from "@/components/PosAfterRenderDiv";
import type ContextMenuProps from "@/components/ContextMenu/Props";
import type SubContextMenuProps from "./Props";
import { Check } from "lucide-react";

export default function SubContextMenuContent({
    children,
    _contextMenuPos,
    _contextMenuDivRef,
    _setContextMenuOpen,
    _setContextMenuPos,
    _contextMenuOpen,
    _triggerRef,
    _hover,
    _setHover,
}: ContextMenuProps &
    SubContextMenuProps & {
        children: ReactNode[] | ReactNode;
    }) {
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

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                localRef.current &&
                !localRef.current.contains(event.target as Node)
            ) {
                _setHover?.(false);
            }
        }
    
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [_setHover]);    

    const localRef = React.useRef<HTMLDivElement>(null);

    if (!_hover) return;

    return (
        <PosAfterRenderDiv
            className="fixed top-0 left-0 h-[calc(100%_-_4rem)] w-full rounded-md bg-neutral-800/90 px-10 md:h-fit md:w-max md:p-1 md:shadow-[0px_0px_20px_3px_#0e0e0e]"
            onDimensionsCalculated={
                innerWidth > 768
                    ? (width, height) => updatePos(width, height)
                    : undefined
            }
            onMouseEnter={() => _setHover?.(true)}
            onMouseLeave={() => _setHover?.(false)}
        >
            <div ref={localRef}>
                <div className="flex flex-col gap-y-1 overflow-y-auto py-20 md:h-fit md:py-0">
                    {childrenWithProps?.map((child, i) => (
                        <label
                            key={i}
                            className="flex items-center gap-3 px-3 cursor-pointer rounded-md hover:bg-neutral-700 transition-colors"
                        >
                            <input type="checkbox" className="peer sr-only" />
                            <span className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 border-gray-500 bg-transparent transition-all peer-checked:border-pink-600 peer-checked:bg-pink-600 hover:border-pink-500" />
                            <span className="flex-1 truncate text-white">{child}</span>
                        </label>
                    ))}
                </div>
            </div>
        </PosAfterRenderDiv>
    );
}
