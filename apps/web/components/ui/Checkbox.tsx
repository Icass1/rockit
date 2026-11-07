import type { InputHTMLAttributes, JSX } from "react";

export function Checkbox({
    className = "",
    ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">): JSX.Element {
    return (
        <input
            {...props}
            type="checkbox"
            className={`border-input accent-primary focus-visible:outline-ring size-4 shrink-0 cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        />
    );
}
