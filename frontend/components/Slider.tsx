"use client";

import { useRef, type ChangeEvent } from "react";

type ChangeEventHandler<T = Element> = (event: ChangeEvent<T>) => void;

interface SliderProps {
    value: number;
    onChange?: ChangeEventHandler<HTMLInputElement> | undefined;
    max?: number;
    min?: number;
    step?: number;
    id: string;
    className?: string;
    barClassName?: string;
    readOnly?: boolean;
}

export default function Slider({
    value,
    onChange,
    max = 100,
    min = 0,
    step,
    id,
    className = "",
    barClassName = "bg-gradient-to-r from-[#ee1086] to-[#fb6467]",
    readOnly = false,
}: SliderProps) {
    // const m = 100 / ((max || 100) - (min || 0));
    // const n = -m * (min || 0);

    const widthPercentage = Math.min(
        100,
        Math.max(0, ((value - min) / (max - min)) * 100)
    );

    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className={className + " relative w-16 rounded-full"}>
            {/* Barra de progreso */}
            <div
                className={
                    "absolute left-0 top-0 block h-full max-w-full rounded-full " +
                    barClassName
                }
                style={{ width: `${widthPercentage}%` }}
                suppressHydrationWarning
            />

            {/* Input tipo rango */}
            <input
                readOnly={readOnly}
                ref={inputRef}
                id={id}
                value={value}
                onChange={onChange}
                type="range"
                min={min}
                max={max}
                step={step}
                className="absolute left-0 h-full w-full cursor-pointer"
            />
        </div>
    );
}
