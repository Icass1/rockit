import type { JSX, ReactNode } from "react";

export function Field({
    id,
    label,
    error,
    children,
}: {
    id: string;
    label: string;
    error?: string;
    children: ReactNode;
}): JSX.Element {
    return (
        <div className="flex flex-col gap-1.5 text-left">
            <label
                htmlFor={id}
                className="text-muted-foreground text-sm font-medium"
            >
                {label}
            </label>
            {children}
            {error && (
                <p
                    id={`${id}-error`}
                    role="alert"
                    className="text-destructive text-sm"
                >
                    {error}
                </p>
            )}
        </div>
    );
}
