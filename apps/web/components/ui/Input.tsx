import type { InputHTMLAttributes, JSX } from "react";

export function Input({
    className = "",
    ...props
}: InputHTMLAttributes<HTMLInputElement>): JSX.Element {
    return (
        <input
            {...props}
            className={`border-input bg-input text-foreground placeholder:text-muted-foreground focus-visible:outline-ring aria-invalid:border-destructive min-h-11 w-full rounded-xl border px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        />
    );
}
