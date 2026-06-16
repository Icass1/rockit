"use client";

import { JSX } from "react";
import { Toaster } from "sonner";

export default function ToasterProvider(): JSX.Element {
    return (
        <>
            <Toaster
                position="bottom-right"
                className="!bottom-[172px] md:!bottom-[108px]"
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
                    background: #14532d !important;
                    color: #bbf7d0 !important;
                }
                [data-sonner-toast][data-type="error"] {
                    background: #7f1d1d !important;
                    color: #fecaca !important;
                }
                [data-sonner-toast]:not([data-type="success"]):not([data-type="error"]) {
                    background: #262626 !important;
                    color: #d4d4d4 !important;
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
