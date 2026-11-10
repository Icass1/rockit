import type { InputHTMLAttributes, JSX } from "react";

export function PasswordInput({
    className = "",
    ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">): JSX.Element {
    return (
        <input
            {...props}
            type="password"
            className={`border-input bg-input text-foreground placeholder:text-muted-foreground focus-visible:outline-ring aria-invalid:border-destructive min-h-11 w-full rounded-xl border px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        />
    );
}
