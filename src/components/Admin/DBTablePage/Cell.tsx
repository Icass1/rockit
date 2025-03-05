import { Copy } from "lucide-react";
import { useState } from "react";

export function Cell({ text }: { text: unknown }) {
    const [hover, setHover] = useState(false);

    return (
        <div
            className="min-w-0 max-w-full w-full grid grid-cols-[1fr_min-content] items-center"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => {
                setHover(false);
            }}
        >
            {typeof text == "string" ||
            typeof text == "number" ||
            typeof text == "undefined" ? (
                <label className="min-w-0 max-w-full w-full block truncate px-1 text-sm text-neutral-300">
                    {text}
                </label>
            ) : (
                <label className="min-w-0 max-w-full w-full block truncate px-1 text-sm text-neutral-500">
                    NULL
                </label>
            )}

            {hover && (
                <Copy
                    className="w-4 h-4 cursor-pointer"
                    onClick={() => {
                        navigator.clipboard.writeText(
                            text?.toString() ?? "Unable to copy data"
                        );
                    }}
                />
            )}
        </div>
    );
}
