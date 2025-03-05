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
            className="grid grid-rows-[min-content_1fr_min-content] md:aspect-[1.618/1] md:h-auto md:w-1/2 w-4/5 h-2/3 absolute bg-[#28282b] z-30 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg overflow-hidden"
        >
            <div className="bg-[#212225] w-full px-5 font-semibold flex flex-row items-center gap-x-1 select-none">
                <label>{title}</label>
                {handlePrevious && (
                    <ArrowUp
                        onClick={handlePrevious}
                        className="w-4 h-4 cursor-pointer"
                    />
                )}
                {handleNext && (
                    <ArrowDown
                        onClick={handleNext}
                        className="w-4 h-4 cursor-pointer"
                    />
                )}
            </div>
            <div className="h-full min-h-0 max-h-full">{children}</div>
            <div
                className="bg-[#212225] w-full px-5 py-1 font-semibold flex flex-row items-center justify-between"
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
