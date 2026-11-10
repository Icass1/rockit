import type { InputHTMLAttributes, JSX } from "react";

export function FileInput({
    className = "",
    ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">): JSX.Element {
    return (
        <input
            {...props}
            type="file"
            className={`border-input bg-input text-foreground focus-visible:outline-ring file:bg-secondary file:text-secondary-foreground min-h-11 w-full rounded-xl border px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        />
    );
}
