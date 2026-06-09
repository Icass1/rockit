"use client";

import { JSX, useRef, type ChangeEvent, type PointerEvent } from "react";

type ChangeEventHandler<T = Element> = (event: ChangeEvent<T>) => void;
type PointerEventHandler<T = Element> = (event: PointerEvent<T>) => void;

interface SliderProps {
    value: number;
    onChange?: ChangeEventHandler<HTMLInputElement> | undefined;
    onPointerDown?: PointerEventHandler<HTMLInputElement> | undefined;
    onPointerUp?: PointerEventHandler<HTMLInputElement> | undefined;
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
    onPointerDown,
    onPointerUp,
    max = 100,
    min = 0,
    step,
    id,
    className = "",
    barClassName = "bg-gradient-to-r from-[#ee1086] to-[#fb6467]",
    readOnly = false,
}: SliderProps): JSX.Element {
    const widthPercentage = Math.min(
        100,
        Math.max(0, ((value - min) / (max - min)) * 100)
    );

    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className={className + " relative w-16 rounded-full"}>
            <div
                className={
                    "absolute top-0 left-0 block h-full max-w-full rounded-full " +
                    barClassName
                }
                style={{ width: `${widthPercentage}%` }}
                suppressHydrationWarning
            />

            <input
                readOnly={readOnly}
                ref={inputRef}
                id={id}
                value={value}
                onChange={onChange}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                type="range"
                min={min}
                max={max}
                step={step}
                className="absolute left-0 h-full w-full cursor-pointer"
            />
        </div>
    );
}
