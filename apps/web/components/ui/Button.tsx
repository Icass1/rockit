import type { ButtonHTMLAttributes, JSX } from "react";

const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/85",
    secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
    ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
    destructive:
        "bg-destructive text-destructive-foreground hover:bg-destructive/85",
};
const sizes = {
    sm: "min-h-8 gap-1.5 rounded-md px-3 text-sm",
    md: "min-h-11 gap-2 rounded-xl px-4 text-sm",
    icon: "size-11 shrink-0 rounded-xl p-2",
};
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: keyof typeof variants;
    size?: keyof typeof sizes;
    loading?: boolean;
}

export function Button({
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    className = "",
    children,
    type = "button",
    ...props
}: ButtonProps): JSX.Element {
    return (
        <button
            {...props}
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={`focus-visible:outline-ring inline-flex items-center justify-center font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none ${variants[variant]} ${sizes[size]} ${className}`}
        >
            {children}
        </button>
    );
}

export function IconButton({
    "aria-label": label,
    ...props
}: Omit<ButtonProps, "size"> & { "aria-label": string }): JSX.Element {
    return <Button {...props} aria-label={label} size="icon" />;
}
