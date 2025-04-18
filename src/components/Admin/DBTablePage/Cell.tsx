"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

export function Cell({ text }: { text: unknown }) {
    const [hover, setHover] = useState(false);

    return (
        <div
            className="grid w-full max-w-full min-w-0 grid-cols-[1fr_min-content] items-center"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => {
                setHover(false);
            }}
        >
            {typeof text == "string" ||
            typeof text == "number" ||
            typeof text == "undefined" ? (
                <label className="block w-full max-w-full min-w-0 truncate px-1 text-sm text-neutral-300">
                    {text}
                </label>
            ) : (
                <label className="block w-full max-w-full min-w-0 truncate px-1 text-sm text-neutral-500">
                    NULL
                </label>
            )}

            {hover && (
                <Copy
                    className="h-4 w-4 cursor-pointer"
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
