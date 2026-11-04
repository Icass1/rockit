"use client";

import { JSX } from "react";
import { Toaster } from "sonner";

export default function ToasterProvider(): JSX.Element {
    return (
        <>
            <Toaster
                position="bottom-right"
                className="bottom-43! md:bottom-27!"
                visibleToasts={3}
                duration={4000}
                toastOptions={{
                    style: {
                        cursor: "pointer",
                    },
                }}
            />
            <style>{`
                [data-sonner-toast] {
                    transform: translateY(0) scale(1) !important;
                    border: none !important;
                    box-shadow: none !important;
                }
                [data-sonner-toast][data-mounted="true"] {
                    animation: sonner-fade-in 300ms ease forwards !important;
                }
                [data-sonner-toast][data-removing="true"] {
                    animation: sonner-fade-out 250ms ease forwards !important;
                    opacity: 0 !important;
                }
                [data-sonner-toast][data-type="success"] {
                    background: var(--color-success-subtle) !important;
                    color: var(--color-success-foreground) !important;
                }
                [data-sonner-toast][data-type="error"] {
                    background: var(--color-error-subtle) !important;
                    color: var(--color-error-foreground) !important;
                }
                [data-sonner-toast][data-type="warning"] {
                    background: var(--color-warning-subtle) !important;
                    color: var(--color-warning-foreground) !important;
                }
                [data-sonner-toast]:not([data-type="success"]):not([data-type="error"]):not([data-type="warning"]) {
                    background: var(--color-elevated) !important;
                    color: var(--color-text) !important;
                }
                @keyframes sonner-fade-in {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                @keyframes sonner-fade-out {
                    from {
                        opacity: 1;
                    }
                    to {
                        opacity: 0;
                    }
                }
            `}</style>
        </>
    );
}
