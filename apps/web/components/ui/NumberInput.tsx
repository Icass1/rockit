import type { InputHTMLAttributes, JSX } from "react";

export function NumberInput({
    className = "",
    ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">): JSX.Element {
    return (
        <input
            {...props}
            type="number"
            className={`border-input bg-input text-foreground focus-visible:outline-ring min-h-11 rounded-lg border px-2 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${className}`}
        />
    );
}
