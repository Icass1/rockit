"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { ReactElement } from "react";

export function BasePopup({
    title,
    handleInsert,
    handleCancel,
    handleUpdate,
    handlePrevious,
    handleNext,
    children,
}: {
    title: string;
    handleInsert?: () => void;
    handleUpdate?: () => void;
    handleCancel?: () => void;
    handlePrevious?: () => void;
    handleNext?: () => void;
    children?: ReactElement | boolean | (ReactElement | boolean | undefined)[];
}) {
    return (
        <div
            id="base-popup"
            style={{ boxShadow: "0px 0px 20px 4px #08080890" }}
            className="absolute top-1/2 left-1/2 z-30 grid h-2/3 w-4/5 -translate-x-1/2 -translate-y-1/2 grid-rows-[min-content_1fr_min-content] overflow-hidden rounded-lg bg-[#28282b] md:aspect-[1.618/1] md:h-auto md:w-1/2"
        >
            <div className="flex w-full flex-row items-center gap-x-1 bg-[#212225] px-5 font-semibold select-none">
                <label>{title}</label>
                {handlePrevious && (
                    <ArrowUp
                        onClick={handlePrevious}
                        className="h-4 w-4 cursor-pointer"
                    />
                )}
                {handleNext && (
                    <ArrowDown
                        onClick={handleNext}
                        className="h-4 w-4 cursor-pointer"
                    />
                )}
            </div>
            <div className="h-full max-h-full min-h-0">{children}</div>
            <div
                className="flex w-full flex-row items-center justify-between bg-[#212225] px-5 py-1 font-semibold"
                style={{ boxShadow: "rgb(8 8 8 / 48%) 0px 0px 10px 4px" }}
            >
                {handleCancel && (
                    <button className="text-red-400" onClick={handleCancel}>
                        Cancel
                    </button>
                )}
                {handleInsert && <button onClick={handleInsert}>Insert</button>}
                {handleUpdate && <button onClick={handleUpdate}>Update</button>}
            </div>
        </div>
    );
}
